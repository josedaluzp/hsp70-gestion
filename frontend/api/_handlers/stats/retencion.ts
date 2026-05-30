import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

function isoMonthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  d.setDate(1)
  return d.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const desde = isoMonthsAgo(5) // ventana de 6 meses (mes actual + 5)

  const [rAltas, rBajas, rAsist] = await Promise.all([
    adminClient.from('usuarios').select('created_at').eq('rol', 'alumno').gte('created_at', desde),
    adminClient.from('usuarios').select('baja_at').eq('rol', 'alumno').not('baja_at', 'is', null).gte('baja_at', desde),
    adminClient.from('asistencias').select(`
      fecha,
      inscripcion:inscripciones!asistencias_inscripcion_id_fkey(alumno_id)
    `).eq('presente', true).gte('fecha', desde.slice(0, 10)),
  ])

  const meses = new Map<string, { altas: number; bajas: number; asistentes: Set<string> }>()
  const bucket = (k: string) => {
    let m = meses.get(k)
    if (!m) { m = { altas: 0, bajas: 0, asistentes: new Set() }; meses.set(k, m) }
    return m
  }

  for (const r of (rAltas.data ?? []) as { created_at: string }[]) bucket(monthKey(r.created_at)).altas++
  for (const r of (rBajas.data ?? []) as { baja_at: string }[]) bucket(monthKey(r.baja_at)).bajas++
  for (const r of (rAsist.data ?? []) as any[]) {
    const alumno = r?.inscripcion?.alumno_id
    if (alumno) bucket(monthKey(r.fecha)).asistentes.add(alumno)
  }

  const result = [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, v]) => ({ mes, altas: v.altas, bajas: v.bajas, asistentes_unicos: v.asistentes.size }))

  return res.status(200).json({ meses: result })
}
