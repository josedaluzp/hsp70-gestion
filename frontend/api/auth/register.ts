import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from '../_lib/supabase'
import { badRequest, internalError } from '../_lib/errors'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nombre, apellido, email, password, telefono, dni, fecha_nacimiento } = req.body ?? {}

  if (!nombre || !apellido || !email || !password) {
    return badRequest(res, 'nombre, apellido, email y password son requeridos')
  }
  if (password.length < 8) {
    return badRequest(res, 'La contraseña debe tener al menos 8 caracteres')
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, apellido }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return badRequest(res, 'El email ya está registrado')
    }
    return internalError(res, error.message)
  }

  if (data.user && (telefono || dni || fecha_nacimiento)) {
    await adminClient.from('usuarios').update({
      telefono: telefono ?? null,
      dni: dni ?? null,
      fecha_nacimiento: fecha_nacimiento ?? null
    }).eq('id', data.user.id)
  }

  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('*')
    .eq('id', data.user!.id)
    .single()

  return res.status(201).json(usuario)
}
