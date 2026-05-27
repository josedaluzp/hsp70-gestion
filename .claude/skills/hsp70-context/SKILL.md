---
name: hsp70-context
description: "Contexto completo del Centro HSP-70: información real del negocio, profesionales, actividades, ubicación y datos para el sistema de gestión. Usar siempre al generar contenido, seed data, textos de UI o configuraciones específicas del centro."
---

# HSP-70 — Contexto Completo del Centro

## Identidad del Centro

- **Nombre:** HSP-70 / Salud & Ciencia HSP-70
- **Tipo:** Centro Fitness con consultorio de salud
- **Distinción:** Primer Centro Fitness de la provincia de Chubut aprobado por el Ministerio de Salud
- **Filosofía:** "Salud Preventiva a través del Ejercicio Físico y la Nutrición"
- **Misión:** Promover la longevidad funcional mediante ejercicio basado en evidencia científica

## Ubicación y Contacto

- **Dirección:** San Martín 1085, Comodoro Rivadavia, Chubut, Argentina
- **Teléfono:** +549 297 6257545
- **Web:** https://www.saludcienciahsp70.com/
- **Redes:** Instagram y Facebook disponibles desde el sitio web

## Actividades Ofrecidas (7 programas)

### 1. Pilates Reformer
- Clases con máquina Reformer
- Mejora flexibilidad, postura y fuerza del core
- Cupo reducido (máx. 8 personas)
- Duración: 50 min

### 2. Entrenamiento Integral
- Sistema completo de optimización del rendimiento físico
- Incluye: fuerza y acondicionamiento, prevención de lesiones, rehabilitación funcional, optimización del rendimiento deportivo
- Cupo: 12 personas | Duración: 60 min

### 3. Fitness Pediátrico
- Programa para niños y adolescentes
- Desarrollo de habilidades motoras básicas, fortalecimiento muscular, formación de hábitos saludables
- Cupo: 10 personas | Duración: 45 min

### 4. Entrenamiento Cardiovascular
- Programas cardiovasculares personalizados
- Adaptados a deportistas, entusiastas del fitness o mejora general de la salud
- Alta intensidad, enfocado en capacidad cardiovascular
- Cupo: 15 personas | Duración: 45 min

### 5. Active Recovery
- Recuperación activa estratégica
- Apoya el desarrollo musculoesquelético y del sistema nervioso post-entrenamiento
- Equipo: deportólogos, entrenadores, médicos y terapeutas
- Cupo: 12 personas | Duración: 50 min

### 6. Readaptación Deportiva
- Proceso integral de recuperación post-lesión
- Previene futuras lesiones y restaura el rendimiento
- Cupo reducido: 6 personas | Duración: 60 min
- Enfoque en medicina basada en evidencia

### 7. Nutrición Deportiva
- Consulta individual (1 persona por turno)
- Servicios: análisis de composición corporal, planificación nutricional personalizada, estrategia de suplementación, nutrición pre/durante/post competencia
- Duración: 40 min

## Equipo Profesional

El centro cuenta con un equipo multidisciplinario. El sitio muestra perfiles visuales de los profesionales. Los nombres ficticios usados en el seed son de reemplazo hasta obtener confirmación de los datos reales. El equipo incluye:

- Profesores de Educación Física certificados
- Especialistas en deportología
- Nutricionistas deportivos
- Médicos/terapeutas especializados en medicina del ejercicio
- Instructores de Pilates certificados

## Planes de Membresía (valores ficticios — confirmar con el centro)

| Plan | Descripción | Actividades | Duración |
|------|-------------|-------------|----------|
| Básico | Acceso a 1 actividad | 1 | 30 días |
| Intermedio | Acceso múltiple | Hasta 3 | 30 días |
| Premium | Acceso ilimitado | Ilimitado | 30 días |

## Salas y Espacios

- **Sala Reformer:** Para Pilates con máquinas
- **Sala Principal:** Entrenamiento integral y funcional
- **Sala Cardio:** Equipamiento cardiovascular
- **Sala Kids:** Fitness pediátrico
- **Sala Relax:** Active Recovery y movilidad
- **Sala Readaptación:** Rehabilitación deportiva
- **Consultorio 1:** Nutrición deportiva (consultas individuales)

## Días y Horarios (template del seed)

| Actividad | Días | Horarios |
|-----------|------|----------|
| Pilates Reformer | L/M/X/J | 08:00 (L/X), 17:00 (M/J) |
| Entrenamiento Integral | L/M/X/J | 10:00 (L/X), 09:00 (M/J) |
| Fitness Pediátrico | M/J | 15:00 |
| Cardio | L/M/X/V | 18:00 (L/M/X/V), 09:00 (V) |
| Active Recovery | M/V | 11:00 |
| Readaptación | L/X | 14:00 |
| Nutrición | M/J | 10:00 |

## Stack Técnico del Sistema de Gestión

- **Backend:** FastAPI + SQLAlchemy async + SQLite → PostgreSQL en producción
- **Frontend:** React 19 + TypeScript + TailwindCSS v4 + Recharts
- **Auth:** JWT (24h), bcrypt, RBAC por roles
- **Roles:** admin, profesor, alumno, recepcionista
- **Reportes:** Excel (openpyxl) + PDF (ReportLab)
- **Puerto backend dev:** 8083 | **Puerto frontend dev:** 5173

## Equipo Real (seed actualizado)

| Nombre | Cargo Real | Rol Sistema | Email |
|--------|-----------|-------------|-------|
| Yanina Figuerao | Directora HSP-70 | profesor | yanina.figuerao@hsp70.com |
| Ángel Da Luz Pereira | Director HSP-70 | profesor | angel.daluz@hsp70.com |
| Facundo Nieva | Profesor Ed. Física | profesor | facundo.nieva@hsp70.com |
| Bruno Rubio | Profesor Ed. Física | profesor | bruno.rubio@hsp70.com |
| Maximiliano Tögel | Lic. Educación Física | profesor | maximiliano.togel@hsp70.com |
| Manuel Pazos Espín | Médico Deportólogo | profesor | manuel.pazos@hsp70.com |
| Walter Ríos | Lic. Kinesiología | profesor | walter.rios@hsp70.com |
| Gabriel Velázquez | Ortopedista | profesor | gabriel.velazquez@hsp70.com |

## Credenciales de Desarrollo

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin (Directora) | admin@hsp70.com | admin123 |
| Admin (Director) | angel.daluz@hsp70.com | admin123 |
| Profesor | facundo.nieva@hsp70.com | profesor123 |
| Alumno | sofia.perez@email.com | alumno123 |

## Notas para el Sistema

- El seed usa `date.today()` para que los datos de asistencia sean actuales
- La asistencia semanal en el dashboard se calcula sobre los últimos 7 días reales
- Los datos de asistencia tienen una tasa del ~80% de presencia
- 15 alumnos activos, 8 profesores (equipo real, incluye directores), 1 admin de sistema, 20 turnos semanales
- Idioma: español Argentina (voseo: "ingresá", "registrate", "hacé")
