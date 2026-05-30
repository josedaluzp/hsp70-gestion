# HSP-70 Gestión — Roadmap & Estado

> Fuente de verdad del estado y la planificación. Reemplaza al obsoleto
> `.tareas/plan.md`. Para la arquitectura, ver [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Hecho

- CRUDs: usuarios, actividades, turnos, planes.
- Inscripciones + lista de espera + liberación de cupo.
- Asistencias / check-in.
- Evaluaciones de salud (IMC).
- Rutinas y ejercicios; asignación a alumnos.
- Notificaciones internas.
- Dashboards básicos por rol (alumno, profesor, admin).
- Landing page.
- Migración de stack a Vercel serverless + Supabase.
- Dashboard de métricas Admin — altas, bajas, en pausa, morosos, horarios pico, retención.

## Sub-proyectos pendientes (en orden)

1. **Design System de arquitectura** — este conjunto de documentos.
   *(en curso)*
2. **Auth con Auth0** — reemplaza Supabase Auth. Rama propia. Define el mapeo de
   identidad `usuarios.id` ↔ Auth0.

## Deuda técnica / bugs detectados

- **Contrato roto en `/stats/dashboard`.** La API devuelve camelCase
  (`totalAlumnos`, `totalTurnos`, `inscripcionesActivas`, `actividades`) pero el
  frontend espera snake_case (`total_alumnos`, `total_profesores`, `turnos_hoy`,
  `inscripciones_activas`, `asistencia_semanal`). Faltan `total_profesores`,
  `turnos_hoy` y `asistencia_semanal`. → **Resuelto** en el sub-proyecto Dashboard
  de métricas Admin (reescritura de `/stats/dashboard` con contrato snake_case).
- **Contratos frontend↔API desalineados.** Varios handlers post-migración devuelven arrays crudos o `{data,total}` mientras los servicios esperan `{items,...}` (ej. `/turnos/:id/inscritos`, `/turnos/:id/asistencias`, `/usuarios`). Asistencia quedó arreglada en el dashboard sub-proyecto; el resto sigue pendiente.
- **Links rotos en dashboard de alumno.** `/alumno/actividades`,
  `/alumno/inscripciones` y `/alumno/pagos` no existen en `App.tsx`.
- **Inconsistencia de tema.** Layout y dashboard admin oscuros vs alumno/profesor
  claros. → Unificar en claro "amp" (D3).
- **Eliminar rol `recepcionista`.** Alterar enum `rol_usuario` (migración) y
  quitarlo de `/stats/dashboard` (hoy lo permite).
- **Eliminar legado.** `src/` (solo artefactos `.egg-info`), `hsp70.db`, `.tareas/plan.md`.
