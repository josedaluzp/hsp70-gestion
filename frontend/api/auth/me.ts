import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { data: usuario, error } = await adminClient
    .from('usuarios')
    .select('*')
    .eq('id', auth.id)
    .single()

  if (error || !usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

  return res.status(200).json(usuario)
}
