import type { VercelRequest, VercelResponse } from '@vercel/node'

// Auth
import authMe from './_handlers/auth/me'
import authRegister from './_handlers/auth/register'
// Usuarios
import usuariosIndex from './_handlers/usuarios/index'
import usuariosById from './_handlers/usuarios/id'
import usuariosToggleActivo from './_handlers/usuarios/id/toggle-activo'
import usuariosCreditos from './_handlers/usuarios/id/creditos'
import usuariosProfesores from './_handlers/usuarios/profesores'
// Actividades
import actividadesIndex from './_handlers/actividades/index'
import actividadesById from './_handlers/actividades/id'
// Turnos
import turnosIndex from './_handlers/turnos/index'
import turnosById from './_handlers/turnos/id'
import turnosInscritos from './_handlers/turnos/id/inscritos'
import turnosAsistencias from './_handlers/turnos/id/asistencias'
// Planes
import planesIndex from './_handlers/planes/index'
import planesById from './_handlers/planes/id'
// Inscripciones
import inscripcionesIndex from './_handlers/inscripciones/index'
import inscripcionesById from './_handlers/inscripciones/id'
// Alumnos
import alumnosInscripciones from './_handlers/alumnos/id/inscripciones'
import alumnosAsistencias from './_handlers/alumnos/id/asistencias'
import alumnosEvaluaciones from './_handlers/alumnos/id/evaluaciones'
import alumnosRutinas from './_handlers/alumnos/id/rutinas'
// Asistencias
import asistenciasIndex from './_handlers/asistencias/index'
import asistenciasById from './_handlers/asistencias/id'
// Evaluaciones
import evaluacionesIndex from './_handlers/evaluaciones/index'
import evaluacionesById from './_handlers/evaluaciones/id'
// Ejercicios
import ejerciciosIndex from './_handlers/ejercicios/index'
import ejerciciosById from './_handlers/ejercicios/id'
// Rutinas
import rutinasIndex from './_handlers/rutinas/index'
import rutinasById from './_handlers/rutinas/id'
import rutinasAsignar from './_handlers/rutinas/id/asignar'
import rutinasAsignaciones from './_handlers/rutinas/id/asignaciones'
// Stats & Notificaciones
import statsDashboard from './_handlers/stats/dashboard'
import notificacionesIndex from './_handlers/notificaciones/index'
import notificacionesLeer from './_handlers/notificaciones/id/leer'
import notificacionesLeerTodas from './_handlers/notificaciones/leer-todas'

function injectId(req: VercelRequest, id: string): VercelRequest {
  req.query.id = id
  return req
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : []

  const [r0, r1, r2, r3] = segments

  try {
    // /api/auth/*
    if (r0 === 'auth' && r1 === 'me') return authMe(req, res)
    if (r0 === 'auth' && r1 === 'register') return authRegister(req, res)

    // /api/usuarios
    if (r0 === 'usuarios' && !r1) return usuariosIndex(req, res)
    if (r0 === 'usuarios' && r1 === 'profesores' && !r2) return usuariosProfesores(req, res)
    if (r0 === 'usuarios' && r1 && !r2) return usuariosById(injectId(req, r1), res)
    if (r0 === 'usuarios' && r1 && r2 === 'toggle-activo') return usuariosToggleActivo(injectId(req, r1), res)
    if (r0 === 'usuarios' && r1 && r2 === 'creditos') return usuariosCreditos(injectId(req, r1), res)

    // /api/actividades
    if (r0 === 'actividades' && !r1) return actividadesIndex(req, res)
    if (r0 === 'actividades' && r1 && !r2) return actividadesById(injectId(req, r1), res)

    // /api/turnos
    if (r0 === 'turnos' && !r1) return turnosIndex(req, res)
    if (r0 === 'turnos' && r1 && !r2) return turnosById(injectId(req, r1), res)
    if (r0 === 'turnos' && r1 && r2 === 'inscritos') return turnosInscritos(injectId(req, r1), res)
    if (r0 === 'turnos' && r1 && r2 === 'asistencias') return turnosAsistencias(injectId(req, r1), res)

    // /api/planes
    if (r0 === 'planes' && !r1) return planesIndex(req, res)
    if (r0 === 'planes' && r1 && !r2) return planesById(injectId(req, r1), res)

    // /api/inscripciones
    if (r0 === 'inscripciones' && !r1) return inscripcionesIndex(req, res)
    if (r0 === 'inscripciones' && r1 && !r2) return inscripcionesById(injectId(req, r1), res)

    // /api/alumnos
    if (r0 === 'alumnos' && r1 && r2 === 'inscripciones') return alumnosInscripciones(injectId(req, r1), res)
    if (r0 === 'alumnos' && r1 && r2 === 'asistencias') return alumnosAsistencias(injectId(req, r1), res)
    if (r0 === 'alumnos' && r1 && r2 === 'evaluaciones') return alumnosEvaluaciones(injectId(req, r1), res)
    if (r0 === 'alumnos' && r1 && r2 === 'rutinas' && !r3) return alumnosRutinas(injectId(req, r1), res)

    // /api/asistencias
    if (r0 === 'asistencias' && !r1) return asistenciasIndex(req, res)
    if (r0 === 'asistencias' && r1 && !r2) return asistenciasById(injectId(req, r1), res)

    // /api/evaluaciones
    if (r0 === 'evaluaciones' && !r1) return evaluacionesIndex(req, res)
    if (r0 === 'evaluaciones' && r1 && !r2) return evaluacionesById(injectId(req, r1), res)

    // /api/ejercicios
    if (r0 === 'ejercicios' && !r1) return ejerciciosIndex(req, res)
    if (r0 === 'ejercicios' && r1 && !r2) return ejerciciosById(injectId(req, r1), res)

    // /api/rutinas
    if (r0 === 'rutinas' && !r1) return rutinasIndex(req, res)
    if (r0 === 'rutinas' && r1 && !r2) return rutinasById(injectId(req, r1), res)
    if (r0 === 'rutinas' && r1 && r2 === 'asignar') return rutinasAsignar(injectId(req, r1), res)
    if (r0 === 'rutinas' && r1 && r2 === 'asignaciones') return rutinasAsignaciones(injectId(req, r1), res)
    if (r0 === 'rutinas' && r1 && r2 === 'asignar' && r3) {
      req.query.alumno_id = r3
      return rutinasAsignar(injectId(req, r1), res)
    }

    // /api/stats
    if (r0 === 'stats' && r1 === 'dashboard') return statsDashboard(req, res)

    // /api/notificaciones
    if (r0 === 'notificaciones' && !r1) return notificacionesIndex(req, res)
    if (r0 === 'notificaciones' && r1 === 'leer-todas') return notificacionesLeerTodas(req, res)
    if (r0 === 'notificaciones' && r1 && r2 === 'leer') return notificacionesLeer(injectId(req, r1), res)

    res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
