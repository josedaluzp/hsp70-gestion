import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  const { id } = req.query as { id: string }

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('planes').select('*').eq('id', id).single()
    if (error || !data) return notFound(res)
    return res.status(200).json(data)
  }

  if (req.method === 'PUT' || req.method === 'DELETE') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('planes').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    const { nombre, creditos, precio, descripcion } = req.body ?? {}
    const { data, error } = await adminClient.from('planes').update({
      nombre, creditos, precio, descripcion
    }).eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
