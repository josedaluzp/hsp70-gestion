import type { VercelResponse } from '@vercel/node'

export function unauthorized(res: VercelResponse, message = 'No autorizado') {
  return res.status(401).json({ error: message })
}

export function forbidden(res: VercelResponse, message = 'Acceso denegado') {
  return res.status(403).json({ error: message })
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message })
}

export function notFound(res: VercelResponse, message = 'No encontrado') {
  return res.status(404).json({ error: message })
}

export function internalError(res: VercelResponse, message = 'Error interno') {
  return res.status(500).json({ error: message })
}
