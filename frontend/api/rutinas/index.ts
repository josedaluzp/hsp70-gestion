import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { requireAuth, requireRole } from '../_lib/auth'
import { badRequest } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res)
  if (!auth) return

  if (req.method === 'GET') {
    const isStaff = ['admin', 'profesor'].includes(auth.rol)
    let query = adminClient.from('rutinas').select(`
      *,
      profesor:usuarios!rutinas_profesor_id_fkey(id, nombre, apellido),
      ejercicios:ejercicios_rutina(
        id, orden, series, repeticiones, duracion_seg, descanso_seg, notas,
        ejercicio:ejercicios(id, nombre, grupo_muscular)
      )
    `).order('nombre')

    if (!isStaff) query = query.eq('profesor_id', auth.id)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const staffCheck = await requireRole(req, res, ['admin', 'profesor'])
    if (!staffCheck) return

    const { nombre, descripcion, ejercicios } = req.body ?? {}
    if (!nombre) return badRequest(res, 'nombre es requerido')

    const { data: rutina, error } = await adminClient.from('rutinas').insert({
      nombre, descripcion: descripcion ?? null, profesor_id: auth.id
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })

    if (Array.isArray(ejercicios) && ejercicios.length > 0) {
      const items = ejercicios.map((e: any, idx: number) => ({
        rutina_id: rutina.id,
        ejercicio_id: e.ejercicio_id,
        series: e.series ?? null,
        repeticiones: e.repeticiones ?? null,
        duracion_seg: e.duracion_seg ?? null,
        descanso_seg: e.descanso_seg ?? null,
        orden: e.orden ?? idx,
        notas: e.notas ?? null
      }))
      await adminClient.from('ejercicios_rutina').insert(items)
    }

    const { data: full } = await adminClient.from('rutinas').select(`
      *, ejercicios:ejercicios_rutina(*, ejercicio:ejercicios(*))
    `).eq('id', rutina.id).single()

    return res.status(201).json(full)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
