# HSP-70 Gestión

Sistema de gestión integral para el centro de salud y fitness **HSP-70**:
alumnos, profesores, actividades, turnos, inscripciones, rutinas, evaluaciones de
salud y planes de membresía.

> **Arquitectura:** ver [`ARCHITECTURE.md`](ARCHITECTURE.md) (fuente de verdad).
> **Roadmap y estado:** ver [`docs/PLAN.md`](docs/PLAN.md).

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, React Router |
| API | Funciones serverless en Vercel (catch-all `frontend/api/[...path].ts`) |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth (migración a Auth0 planificada) |
| Despliegue | Vercel |

## Requisitos previos

- Node.js >= 20.19 (o >= 22 LTS recomendado)
- npm >= 10
- Cuenta de Supabase y proyecto creado
- Vercel CLI (opcional, para correr funciones serverless en local)

## Configuración de entorno

Crear `frontend/.env.local` con:

```
VITE_SUPABASE_URL=<url de tu proyecto Supabase>
VITE_SUPABASE_ANON_KEY=<anon key>
```

Para las funciones serverless (entorno de Vercel / `.env` local de funciones):

```
SUPABASE_URL=<url de tu proyecto Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

> Nunca commitear `.env*` ni claves.

## Instalación

```bash
cd frontend
npm install
```

## Base de datos

Aplicar las migraciones de `frontend/supabase/migrations/` (en orden) sobre tu
proyecto Supabase, vía el SQL editor o la CLI de Supabase.

## Ejecución en local

```bash
cd frontend
npm run dev
```

La SPA queda en `http://localhost:5173`. Para ejecutar las funciones serverless
junto con el frontend, usar `vercel dev` desde `frontend/`.

## Estructura del proyecto

Ver [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.

## Despliegue

El proyecto se despliega en Vercel. Las variables de entorno
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) se configuran en el dashboard de Vercel.

## Roles

| Rol | Permisos |
|-----|----------|
| Admin | Acceso total: usuarios, actividades, turnos, planes, métricas. |
| Profesor | Ve sus turnos y alumnos; toma asistencia; crea evaluaciones y rutinas. |
| Alumno | Ve sus clases, planes, rutinas y perfil; se inscribe a turnos. |

## Licencia

Proyecto privado. Todos los derechos reservados.
