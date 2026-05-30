# Design — Dashboard de métricas Admin

**Fecha:** 2026-05-29
**Tipo:** Sub-proyecto 3 de 3 — `Dashboard de métricas Admin`
**Estado:** Aprobado, pendiente de plan de implementación
**Fuente de verdad:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md)

---

## 1. Contexto y problema

El dashboard admin actual (`frontend/src/pages/admin/Dashboard.tsx`) tiene la UI
hecha (5 tarjetas + gráfico de asistencia semanal + accesos rápidos) pero **está
roto y es mínimo**:

- **Contrato roto:** el frontend (`DashboardStats`) espera snake_case
  (`total_alumnos`, `total_profesores`, `total_actividades`, `turnos_hoy`,
  `inscripciones_activas`, `asistencia_semanal`) pero el handler
  (`/stats/dashboard`) devuelve camelCase (`totalAlumnos`, `alumnosActivos`,
  `totalTurnos`, `inscripcionesActivas`, `actividades`) y **no** devuelve
  `total_profesores`, `turnos_hoy` ni `asistencia_semanal`. → tarjetas en 0 y
  gráfico vacío.
- **Falta lo que el admin necesita:** altas, bajas, inactivos, horarios pico,
  morosos, retención.

## 2. Objetivo

Reconstruir el dashboard admin para que el administrador vea las métricas clave del
gimnasio: quién ingresó (altas), quién se dio de baja, quién está inactivo
(en pausa), morosos (sin créditos), cuándo hubo más gente (horarios pico) y la
evolución mensual — arreglando de paso el contrato roto de `/stats/dashboard`.

## 3. Definiciones (decididas)

| Concepto | Definición |
|----------|------------|
| **Alta** | `usuarios` rol `alumno` con `created_at` dentro del período (p.ej. 30 días). |
| **Baja** | Se fue del gimnasio: `usuarios.activo = false` (flag existente, lo togglea el admin). |
| **Inactivo / en pausa** | Avisó que no asistirá un tiempo (vacaciones). **Flag nuevo** (`en_pausa`) que marca el **profesor**. Distinto de "baja". |
| **Moroso** | Alumno `activo = true` con `creditos = 0` (no puede anotarse; el sistema usa créditos, no fechas de vencimiento). |
| **Horario pico** | Asistencias `presente = true` agrupadas por día de la semana × franja horaria del turno. |
| **Retención / evolución** | Por mes: altas, asistentes únicos, bajas. |

## 4. Alcance

**Un solo sub-proyecto, todo junto.** Incluye:
1. Una feature de **escritura**: el flag `en_pausa` (columna + endpoint + checkbox
   del profesor), porque la métrica "inactivos" depende de ella.
2. El **dashboard de lectura** (métricas + listas).

Decisión de no separar: el dashboard sin el flag mostraría una métrica muerta.

### Fuera de alcance (YAGNI)
- Ingresos en $ (los datos —`transacciones_creditos`— registran créditos, no qué
  plan/precio; no es confiable).
- Página de detalle de usuario (se reutiliza el buscador del listado de usuarios).
- Restringir "en pausa" solo a alumnos de los turnos del profesor (MVP:
  profesor+admin pueden marcar cualquier alumno; endurecible luego).
- Selector de rango de fechas (se usan rangos fijos: hoy, 7 días, 30 días, mes).

## 5. Enfoque técnico

**Endpoints de stats enfocados, con queries en TypeScript** (sigue el patrón
`_handlers` + `adminClient` + tests vitest). Se descarta una mega-RPC SQL (difícil
de testear con el setup actual) y un único endpoint monolítico (listas grandes,
poco modular).

## 6. Cambios de esquema (migración `012_metricas.sql`)

```sql
-- Flag "inactivo / en pausa" (marcado por el profesor)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS en_pausa boolean NOT NULL DEFAULT false;

-- Marca temporal de baja (para la tendencia mensual de bajas)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS baja_at timestamptz;
```

> `baja_at` solo registra bajas a partir de su despliegue (las históricas quedan
> sin fecha; aceptable en un sistema nuevo). La **lista** de bajas no depende de
> `baja_at` (usa `activo = false`); solo la **tendencia mensual** lo usa.

## 7. Feature "en pausa" (escritura)

- **Endpoint** `POST /usuarios/:id/pausa` (toggle de `en_pausa`), permitido a
  **profesor y admin**. Devuelve el usuario actualizado.
- **Modificar `toggle-activo`** (`_handlers/usuarios/id/toggle-activo.ts`): al
  desactivar (`activo → false`) setear `baja_at = now()`; al reactivar, `baja_at = null`.
- **UI profesor:** checkbox "En pausa" por alumno en la vista de **Asistencia**
  (`pages/profesor/Asistencia.tsx`), donde el profesor ya ve a sus inscritos.
  Optimista, con rollback si falla.

## 8. Endpoints de lectura (dashboard)

### 8.1. `/stats/dashboard` (arreglado + ampliado)
Devuelve el contrato **snake_case** que el frontend ya espera, ampliado:

```ts
interface DashboardStats {
  total_alumnos: number;          // alumnos activos
  total_profesores: number;
  total_actividades: number;      // activas
  turnos_hoy: number;             // turnos activos cuyo dia_semana = hoy
  inscripciones_activas: number;
  asistencia_semanal: { fecha: string; presentes: number; ausentes: number }[]; // 7 días
  altas_30d: number;              // nuevos alumnos últimos 30 días
  bajas: number;                  // alumnos activo=false
  en_pausa: number;               // alumnos en_pausa=true
  morosos: number;                // alumnos activo=true y creditos=0
}
```
- Roles permitidos: **admin** (se quita `recepcionista` del check actual, alineado
  con D4 del ARCHITECTURE).

### 8.2. `/stats/horarios-pico`
Asistencias `presente=true` (join `inscripciones`→`turnos`) agrupadas por
`dia_semana` × franja horaria (hora de `hora_inicio`). Respuesta:
```ts
{ celdas: { dia: DiaSemana; hora: number; total: number }[] }
```

### 8.3. `/stats/retencion`
Por mes (últimos ~6 meses):
```ts
{ meses: { mes: string; altas: number; bajas: number; asistentes_unicos: number }[] }
```
- `altas` por `created_at`; `bajas` por `baja_at`; `asistentes_unicos` =
  alumnos distintos con asistencia `presente` ese mes.

### 8.4. Listas accionables (quién)
Se reutiliza `/usuarios` (ya tiene paginación, búsqueda y filtros por rol/activo),
agregando filtros:
- `creditos=0` (morosos), `en_pausa=true` (en pausa), orden por `created_at`
  (altas) o `baja_at` (bajas).

El frontend pide la lista con el filtro correspondiente. Click en un nombre →
navega a `/admin/usuarios?search=<email>` (reutiliza el buscador del listado; sin
página de detalle nueva).

## 9. Frontend — dashboard (tema claro "amp", Recharts ya instalado)

Secciones de `admin/Dashboard.tsx` (reescritura del contenido, manteniendo el
patrón de componentes y el tema claro):

1. **Tarjetas base** (arregladas): alumnos activos, profesores, actividades,
   turnos hoy, inscripciones activas.
2. **Tarjetas de estado**: altas (30d), bajas, en pausa, morosos — cada una abre
   una **lista expandible** con nombres clickeables (→ usuarios).
3. **Asistencia semanal** (arreglada): bar chart presentes/ausentes (7 días).
4. **Horarios pico**: heatmap día × franja horaria con CSS grid (intensidad por
   color; sin librería extra).
5. **Retención mensual**: line/area chart (altas vs bajas vs asistentes únicos).

## 10. Testing

- **API (vitest, TDD):** cada endpoint con `adminClient` mockeado —
  `/stats/dashboard` (contadores correctos + shape snake_case), `horarios-pico`
  (agrupación), `retencion` (buckets mensuales); `POST /usuarios/:id/pausa`
  (autorización: profesor+admin sí, alumno 403; toggle correcto); `toggle-activo`
  (setea/limpia `baja_at`). Filtros nuevos en `/usuarios` (creditos=0, en_pausa).
- **Frontend:** build/typecheck (sin infra de tests de componentes; desviación
  documentada, consistente con el resto del proyecto).

## 11. Decisiones (ADR-lite)

- **M1 — Inactivo ≠ baja.** `en_pausa` (flag nuevo, profesor) vs `activo=false`
  (baja, admin).
- **M2 — Moroso = créditos 0** (no hay fechas de vencimiento; el sistema es por
  créditos).
- **M3 — Endpoints de stats en TS** (no RPC SQL), por testabilidad.
- **M4 — Listas vía `/usuarios` + filtros** (no endpoints de lista nuevos), DRY.
- **M5 — `recepcionista` se quita del check de `/stats/dashboard`** (alineado con
  D4 de ARCHITECTURE).

## 12. Criterios de éxito

- El dashboard muestra datos reales correctos en todas las tarjetas y el gráfico
  semanal (contrato arreglado).
- El admin ve altas, bajas, en-pausa y morosos con listas clickeables.
- Hay un heatmap de horarios pico y un gráfico de evolución mensual.
- Un profesor puede marcar/desmarcar "en pausa" a un alumno desde Asistencia.
- Al dar de baja a un alumno se registra `baja_at`.
- Tests verdes para los endpoints de stats y la autorización de `pausa`.
