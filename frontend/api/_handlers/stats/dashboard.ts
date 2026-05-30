import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isoDateDaysAgo(days: number): string {
  return isoDaysAgo(days).slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const hoy = DIAS[new Date().getDay()]
  const desde30 = isoDaysAgo(30)
  const desde7 = isoDateDaysAgo(7)

  const LIST_LIMIT = 50
  const mini = 'id, nombre, apellido, email'

  // Counts (head:true → solo count)
  const [
    rAlumnos, rProfes, rActs, rTurnosHoy, rInscr,
    rAsist, rAltas, rBajas, rPausa, rMorosos,
  ] = await Promise.all([
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'alumno').eq('activo', true),
    adminClient.from('usuarios').select('*', { count: 'exact', head: true }).eq('rol', 'profesor'),
    adminClient.from('actividades').select('*', { count: 'exact', head: true }).eq('activa', true),
    adminClient.from('turnos').select('*', { count: 'exact', head: true }).eq('activo', true).eq('dia_semana', hoy),
    adminClient.from('inscripciones').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    adminClient.from('asistencias').select('fecha, presente').gte('fecha', desde7),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').gte('created_at', desde30).order('created_at', { ascending: false }).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('activo', false).order('baja_at', { ascending: false }).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('en_pausa', true).limit(LIST_LIMIT),
    adminClient.from('usuarios').select(mini).eq('rol', 'alumno').eq('activo', true).eq('creditos', 0).limit(LIST_LIMIT),
  ])

  // Weekly attendance: presentes/ausentes por fecha
  const semanaMap = new Map<string, { presentes: number; ausentes: number }>()
  for (const row of (rAsist.data ?? []) as { fecha: string; presente: boolean }[]) {
    const cur = semanaMap.get(row.fecha) ?? { presentes: 0, ausentes: 0 }
    if (row.presente) cur.presentes++
    else cur.ausentes++
    semanaMap.set(row.fecha, cur)
  }
  const asistencia_semanal = [...semanaMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, presentes: v.presentes, ausentes: v.ausentes }))

  return res.status(200).json({
    total_alumnos: rAlumnos.count ?? 0,
    total_profesores: rProfes.count ?? 0,
    total_actividades: rActs.count ?? 0,
    turnos_hoy: rTurnosHoy.count ?? 0,
    inscripciones_activas: rInscr.count ?? 0,
    asistencia_semanal,
    altas_30d: (rAltas.data ?? []).length,
    bajas: (rBajas.data ?? []).length,
    en_pausa: (rPausa.data ?? []).length,
    morosos: (rMorosos.data ?? []).length,
    altas_lista: rAltas.data ?? [],
    bajas_lista: rBajas.data ?? [],
    en_pausa_lista: rPausa.data ?? [],
    morosos_lista: rMorosos.data ?? [],
  })
}
