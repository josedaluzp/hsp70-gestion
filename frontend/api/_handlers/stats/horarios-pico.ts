import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin'])
  if (!auth) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { data, error } = await adminClient
    .from('asistencias')
    .select(`
      inscripcion:inscripciones!asistencias_inscripcion_id_fkey(
        turno:turnos!inscripciones_turno_id_fkey(dia_semana, hora_inicio)
      )
    `)
    .eq('presente', true)

  if (error) return res.status(500).json({ error: error.message })

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as any[]) {
    const turno = row?.inscripcion?.turno
    if (!turno?.dia_semana || !turno?.hora_inicio) continue
    const hora = parseInt(String(turno.hora_inicio).slice(0, 2), 10)
    const key = `${turno.dia_semana}|${hora}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const celdas = [...counts.entries()].map(([key, total]) => {
    const [dia, hora] = key.split('|')
    return { dia, hora: Number(hora), total }
  })

  return res.status(200).json({ celdas })
}
