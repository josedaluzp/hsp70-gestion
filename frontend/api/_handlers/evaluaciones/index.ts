import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../../_lib/supabase'
import { requireRole } from '../../_lib/auth'
import { badRequest } from '../../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireRole(req, res, ['admin', 'profesor'])
  if (!auth) return

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { alumno_id, fecha, peso_kg, altura_cm, grasa_corporal_pct, notas } = req.body ?? {}
  if (!alumno_id || !fecha) return badRequest(res, 'alumno_id y fecha son requeridos')

  const imc = peso_kg && altura_cm
    ? parseFloat((peso_kg / Math.pow(altura_cm / 100, 2)).toFixed(2))
    : null

  const { data, error } = await adminClient.from('evaluaciones').insert({
    alumno_id,
    profesor_id: auth.id,
    fecha,
    peso_kg: peso_kg ?? null,
    altura_cm: altura_cm ?? null,
    imc,
    grasa_corporal_pct: grasa_corporal_pct ?? null,
    notas: notas ?? null
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}
