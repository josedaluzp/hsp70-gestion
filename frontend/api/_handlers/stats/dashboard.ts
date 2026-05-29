import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'recepcionista'])
  if (!auth) return

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [
    { count: totalAlumnos },
    { count: alumnosActivos },
    { count: totalTurnos },
    { count: inscripcionesActivas },
    { data: actividades }
  ] = await Promise.all([
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno'),
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno').eq('activo', true),
    adminClient.from('turnos').select('*', { count: 'exact', head: true }).eq('activo', true),
    adminClient.from('inscripciones').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    adminClient.from('actividades').select('id, nombre').eq('activa', true).limit(10)
  ])

  return res.status(200).json({
    totalAlumnos,
    alumnosActivos,
    totalTurnos,
    inscripcionesActivas,
    actividades: actividades ?? []
  })
}
