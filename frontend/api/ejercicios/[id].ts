import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('ejercicios').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('ejercicios').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, descripcion, grupo_muscular, video_url } = req.body ?? {}
    const { data, error } = await adminClient.from('ejercicios').update({
      nombre, descripcion, grupo_muscular, video_url
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
