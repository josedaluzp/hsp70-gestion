import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id, nombre, apellido, email')
    .eq('rol', 'profesor')
    .eq('activo', true)
    .order('apellido')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
