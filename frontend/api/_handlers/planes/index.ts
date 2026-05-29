import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth, requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const { data, error } = await adminClient.from('planes').select('*').order('precio')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const adminCheck = await requireRole(req, res, ['admin'])
    if (!adminCheck) return

    const { nombre, creditos, precio, descripcion } = req.body ?? {}
    if (!nombre || !creditos || precio === undefined) {
      return badRequest(res, 'nombre, creditos y precio son requeridos')
    }

    const { data, error } = await adminClient.from('planes').insert({
      nombre, creditos, precio, descripcion: descripcion ?? null
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
