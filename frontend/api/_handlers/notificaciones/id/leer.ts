import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../../_lib/supabase'
import { requireAuth } from '../../../_lib/auth'
import { notFound, forbidden } from '../../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data: notif } = await adminClient
    .from('notificaciones').select('usuario_id').eq('id', id).single()
  if (!notif) return notFound(res)
  if (notif.usuario_id !== auth.id) return forbidden(res)

  const { data, error } = await adminClient.from('notificaciones')
    .update({ leida: true }).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
