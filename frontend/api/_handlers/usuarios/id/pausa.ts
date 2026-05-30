import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../../_lib/supabase'
import { requireRole } from '../../../_lib/auth'
import { notFound } from '../../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }

  const { data: current } = await adminClient
    .from('usuarios').select('en_pausa').eq('id', id).single()
  if (!current) return notFound(res)

  const { data, error } = await adminClient
    .from('usuarios')
    .update({ en_pausa: !current.en_pausa })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
