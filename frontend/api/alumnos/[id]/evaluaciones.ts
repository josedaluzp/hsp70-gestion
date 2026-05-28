import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query as { id: string }
  if (auth.rol === 'alumno' && auth.id !== id) return forbidden(res)

  const { data, error } = await adminClient.from('evaluaciones').select(`
    *,
    profesor:usuarios!evaluaciones_profesor_id_fkey(id, nombre, apellido)
  `).eq('alumno_id', id).order('fecha', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json(data)
}
