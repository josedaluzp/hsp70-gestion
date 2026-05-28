import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const { error } = await adminClient.from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', auth.id)
    .eq('leida', false)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).end()
}
