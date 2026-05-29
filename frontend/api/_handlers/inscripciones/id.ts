import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data, error } = await adminClient.rpc('cancelar_inscripcion', {
    p_inscripcion_id: parseInt(id),
    p_usuario_id: auth.id
  })

  if (error) {
    if (error.message.includes('not_found')) return res.status(404).json({ error: 'Inscripción no encontrada' })
    if (error.message.includes('forbidden')) return res.status(403).json({ error: 'No autorizado' })
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json(data)
}
