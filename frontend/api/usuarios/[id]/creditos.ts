import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  const { cantidad, descripcion } = req.body ?? {}

  if (cantidad === undefined || typeof cantidad !== 'number') {
    return badRequest(res, 'cantidad (number) es requerida')
  }

  const { error } = await adminClient.rpc('ajustar_creditos', {
    p_usuario_id: id,
    p_cantidad: cantidad,
    p_descripcion: descripcion ?? 'Ajuste manual'
  })

  if (error) return res.status(500).json({ error: error.message })

  const { data: usuario } = await adminClient
    .from('usuarios').select('id, creditos').eq('id', id).single()
  return res.status(200).json(usuario)
}
