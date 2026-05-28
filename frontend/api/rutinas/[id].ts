import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound, forbidden } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('rutinas').select(`
      *,
      profesor:usuarios!rutinas_profesor_id_fkey(id, nombre, apellido),
      ejercicios:ejercicios_rutina(
        id, orden, series, repeticiones, duracion_seg, descanso_seg, notas,
        ejercicio:ejercicios(id, nombre, descripcion, grupo_muscular, video_url)
      )
    `).eq('id', id).single()

    if (error || !data) return notFound(res)
    if (auth.rol === 'profesor' && data.profesor_id !== auth.id) return forbidden(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { data: rutina } = await adminClient.from('rutinas').select('profesor_id').eq('id', id).single()
    if (!rutina) return notFound(res)
    if (auth.rol === 'profesor' && rutina.profesor_id !== auth.id) return forbidden(res)

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('rutinas').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, descripcion } = req.body ?? {}
    const { data, error } = await adminClient.from('rutinas').update({
      nombre, descripcion
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
