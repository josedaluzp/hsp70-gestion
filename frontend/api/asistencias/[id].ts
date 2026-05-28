import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireRole } from '../_lib/auth'
import { notFound } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { presente, observacion } = req.body ?? {}

  const { data, error } = await adminClient.from('asistencias').update({
    presente, observacion
  }).eq('id', id).select().single()

  if (error || !data) return notFound(res)
  return res.status(200).json(data)
}
