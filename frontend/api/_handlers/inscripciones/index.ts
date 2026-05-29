import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireAuth } from '../../_lib/auth'
import { badRequest, forbidden } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { alumno_id, turno_id } = req.body ?? {}
  if (!turno_id) return badRequest(res, 'turno_id es requerido')

  const targetAlumnoId = alumno_id ?? auth.id
  if (auth.rol === 'alumno' && targetAlumnoId !== auth.id) return forbidden(res)

  const { data, error } = await adminClient.rpc('inscribir_alumno', {
    p_alumno_id: targetAlumnoId,
    p_turno_id: parseInt(turno_id)
  })

  if (error) {
    if (error.message.includes('sin_creditos')) return badRequest(res, 'Créditos insuficientes')
    if (error.message.includes('ya_inscripto')) return badRequest(res, 'Ya estás inscripto en este turno')
    if (error.message.includes('alumno_not_found')) return badRequest(res, 'Alumno no encontrado')
    return res.status(500).json({ error: error.message })
  }

  const statusCode = data?.resultado === 'inscripto' ? 201 : 200
  return res.status(statusCode).json(data)
}
