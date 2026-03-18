# HSP-70 GESTIÓN — Plan del Proyecto

## Requisito de diseño frontend
El frontend debe tener un diseño profesional, estético y minimalista. No usar templates genéricos ni UI de aspecto "AI-generated". Buscar un look limpio, moderno, con buena tipografía, espaciado generoso y paleta de colores coherente con un centro de salud/fitness premium.

## Stack definido
- **Frontend:** React 18+ con Vite, TailwindCSS, React Router, Recharts para gráficos
- **Backend:** Python FastAPI, SQLAlchemy, Pydantic, JWT (python-jose), bcrypt
- **Base de datos:** SQLite con WAL mode
- **Pagos:** API de Mercado Pago (SDK Python)
- **Exportación:** openpyxl (Excel) + ReportLab (PDF)

---

## Especificación completa

HSP-70 Gestión es un sistema web integral para digitalizar las operaciones del centro de fitness HSP-70 (San Martín 1085, Comodoro Rivadavia, Chubut), primer Centro de Fitness en Chubut aprobado por el Ministerio de Salud.

### Roles (4)
- **Alumno:** auto-registro, inscripción a turnos, pagos, historial, evaluaciones de salud, notificaciones
- **Profesor:** lista de asistencia, evaluaciones de salud de sus alumnos, notas privadas
- **Recepcionista:** registro de alumnos, inscripciones, pagos manuales, check-in
- **Administrador:** todo lo anterior + CRUD actividades/turnos/planes + dashboard métricas + reportes + gestión usuarios

### Actividades (7)
1. Pilates Reformer
2. Entrenamiento Integral
3. Fitness Pediátrico
4. Entrenamiento Cardiovascular
5. Active Recovery
6. Readaptación Deportiva
7. Nutrición Deportiva

### Base de datos (10 tablas)
1. usuarios (id, nombre, apellido, email, password_hash, telefono, dni, fecha_nacimiento, rol, activo, created_at)
2. actividades (id, nombre, descripcion, cupo_maximo, duracion_min, activa)
3. turnos (id, actividad_id FK, profesor_id FK, dia_semana, hora_inicio, hora_fin, sala, activo)
4. inscripciones (id, alumno_id FK, turno_id FK, estado, fecha_inscripcion)
5. asistencias (id, inscripcion_id FK, fecha, presente, observacion)
6. planes (id, nombre, descripcion, precio, duracion_dias, max_actividades)
7. pagos (id, alumno_id FK, plan_id FK, monto, fecha_pago, fecha_vencimiento, estado, mp_payment_id, metodo_pago)
8. evaluaciones_salud (id, alumno_id FK, profesional_id FK, fecha, peso_kg, altura_cm, imc, grasa_corporal, objetivo, notas)
9. lista_espera (id, alumno_id FK, turno_id FK, posicion, fecha)
10. notificaciones (id, usuario_id FK, tipo, mensaje, leida, fecha)

### Integración Mercado Pago
- Alumno selecciona plan → backend genera preferencia MP → alumno paga → webhook confirma → membresía se activa
- Pagos manuales (efectivo/transferencia) registrados por recepcionista
- Verificación diaria de vencimientos: 5 días antes → alerta, al vencer → estado "vencido" + notificación

### Dashboard Admin (métricas)
- Alumnos: activos/inactivos, nuevos/mes, ranking asistencias, retención, distribución por actividad
- Profesores: ranking por alumnos, tasa asistencia, turnos asignados
- Financieras: ingresos/mes, por plan, por actividad, morosos
- Operativas: ocupación por turno, listas de espera, horarios demanda

### Reportes exportables
- Listado alumnos (Excel)
- Asistencias por período (Excel)
- Historial pagos (Excel)
- Ficha alumno (PDF con gráficos de evolución)
- Reporte morosos (Excel)

### Lista de espera
- Auto-asignación de posición
- Notificación cuando se libera cupo
- 24h para confirmar, sino pasa al siguiente

### Notificaciones (internas, no email/WhatsApp)
- Pago próximo a vencer (5 días antes)
- Pago vencido
- Lugar en lista de espera
- Confirmación de pago
- Inscripción exitosa
- Cancelación de inscripción
