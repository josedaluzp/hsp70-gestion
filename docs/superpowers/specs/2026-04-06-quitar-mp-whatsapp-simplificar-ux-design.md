# Spec: Quitar MercadoPago, WhatsApp Redirect y Simplificación UX

**Fecha:** 2026-04-06
**Branch:** feat/rutinas-ejercicios (continuación)
**Estado:** Aprobado

---

## 1. Objetivo

Reemplazar la integración de MercadoPago por un redirect a WhatsApp para gestionar pagos externamente (WhatsApp bot + n8n + Google Sheets), y simplificar la experiencia de usuario para los tres roles (alumno, profesor, admin).

## 2. Contexto

- La web actual del negocio es https://www.saludcienciahsp70.com — básica, con datos de transferencia a nombre de Yanina Veronica Figueroa (CVU: 0000003100095168457674, alias: muro.sapa.roca.mp)
- El flujo de pago se mueve fuera del sistema: el alumno ve planes en la app → click abre WhatsApp → bot (n8n) envía datos de transferencia → alumno envía comprobante → agente valida y carga en Google Sheets
- Número de WhatsApp: 542975027842

## 3. Qué se elimina

### 3.1 Backend — eliminar archivos completos

| Archivo | Motivo |
|---------|--------|
| `app/api/mercadopago.py` | Router de MercadoPago |
| `app/services/mercadopago_service.py` | Servicio de integración MP |
| `app/services/vencimiento_service.py` | Servicio de vencimientos de pago |
| `app/schemas/vencimiento.py` | Schemas de vencimiento |
| `app/api/vencimientos.py` | Router de vencimientos (si existe) |
| `app/tests/test_mercadopago.py` | Tests de MP |
| `app/tests/test_pagos.py` | Tests de pagos CRUD |

### 3.2 Backend — simplificar

| Archivo | Cambio |
|---------|--------|
| `app/models/pago.py` | Eliminar — pagos se gestionan en Google Sheets |
| `app/schemas/pago.py` | Eliminar — ya no hay modelo de pago |
| `app/api/pagos.py` | Eliminar — ya no hay endpoints de pago |
| `app/services/pago_service.py` | Eliminar — ya no hay servicio de pago |
| `app/models/enums.py` | Quitar `EstadoPago`, `MetodoPago`, `TipoPago` (todos relacionados a pagos) |
| `app/models/plan.py` | Quitar campo `precio_suscripcion` |
| `app/models/usuario.py` | Quitar relación `pagos` (back_populates) |
| `app/main.py` | Quitar imports/inclusión de routers de mercadopago, pagos y vencimientos |
| `app/core/config.py` | Quitar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` |
| `pyproject.toml` | Quitar dependencia `mercadopago>=2.2` |
| `.env` / `.env.example` | Quitar variables `MP_*` |

### 3.3 Frontend — eliminar/transformar

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/alumno/Pagos.tsx` | Reescribir como `Planes.tsx` (showcase + WhatsApp CTA) |
| `frontend/src/pages/alumno/Actividades.tsx` + `Inscripciones.tsx` | Fusionar en `MisClases.tsx` |
| `frontend/src/pages/admin/Reportes.tsx` | Eliminar (pagos van a Google Sheets) |
| `frontend/src/pages/admin/Notificaciones.tsx` | Eliminar (notificaciones eran de vencimiento de pagos) |
| `frontend/src/services/alumnoApi.ts` | Quitar objeto `mercadopago` y tipos de pago |
| `frontend/src/services/adminApi.ts` | Quitar `reportes.pagosExcel` y stats de pagos |
| `frontend/src/layouts/MainLayout.tsx` | Actualizar navegación para los 3 roles |
| `frontend/src/App.tsx` | Actualizar rutas |

### 3.4 Frontend — eliminar páginas de Ejercicios standalone

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/profesor/Ejercicios.tsx` | Eliminar (se accede desde Rutinas) |
| `frontend/src/pages/admin/Ejercicios.tsx` | Eliminar (se accede desde Rutinas) |

## 4. Nueva experiencia por rol

### 4.1 Alumno (4 items de navegación)

| Item | Ruta | Descripción |
|------|------|-------------|
| Mi Panel | `/alumno/dashboard` | Se mantiene — clases inscriptas y próximas |
| Mis Clases | `/alumno/clases` | Fusión de Actividades + Inscripciones. Ve clases disponibles y las suyas, con inscripción/cancelación directa |
| Planes | `/alumno/planes` | Cards con planes (nombre, precio, descripción). Botón "Contratar por WhatsApp" por plan |
| Mi Rutina | `/alumno/rutinas` | Se mantiene — rutinas asignadas por el profesor |
| Mi Perfil | `/alumno/perfil` | Se mantiene — evaluaciones y datos personales |

### 4.2 Profesor (5 items de navegación)

| Item | Ruta | Descripción |
|------|------|-------------|
| Mi Panel | `/profesor/dashboard` | Se mantiene |
| Mis Clases | `/profesor/turnos` | Renombra "Mis Turnos" para consistencia |
| Asistencia | `/profesor/asistencia` | Se mantiene |
| Evaluaciones | `/profesor/evaluaciones` | Se mantiene |
| Rutinas | `/profesor/rutinas` | Se mantiene — ejercicios se gestionan dentro del flujo de rutinas |

### 4.3 Admin (6 items de navegación)

| Item | Ruta | Descripción |
|------|------|-------------|
| Mi Panel | `/admin/dashboard` | Se mantiene (quitar KPIs de pagos) |
| Usuarios | `/admin/usuarios` | Se mantiene |
| Actividades | `/admin/actividades` | Se mantiene |
| Turnos | `/admin/turnos` | Se mantiene |
| Planes | `/admin/planes` | Se mantiene, quitar campo `precio_suscripcion` |
| Rutinas | `/admin/rutinas` | Se mantiene — ejercicios se gestionan dentro |

## 5. Página de Planes (alumno) — detalle

### 5.1 Estructura

```
┌─────────────────────────────────────────┐
│  Nuestros Planes                        │
│  Elegí el plan que mejor se adapte      │
│  a tus objetivos                        │
├─────────┬─────────┬─────────────────────┤
│  Card 1 │  Card 2 │  Card 3             │
│  Plan X │  Plan Y │  Plan Z             │
│  $XX/mes│  $XX/mes│  $XX/mes            │
│  ...    │  ...    │  ...                │
│  [WhatsAppBtn]  [WhatsApp Btn] [Btn]   │
└─────────┴─────────┴─────────────────────┘
```

### 5.2 Card de plan

- Nombre del plan
- Precio mensual
- Descripción
- Duración (ej: "30 días")
- Máximo de actividades incluidas
- Botón primario: "Contratar por WhatsApp" (ícono de WhatsApp)

### 5.3 WhatsApp link

```
https://wa.me/542975027842?text=Hola! Quiero contratar el plan {nombre} (${precio}/mes). Mi nombre es {nombre_alumno}.
```

El mensaje incluye el nombre del alumno logueado para facilitar la identificación en el bot.

## 6. Fusión Mis Clases (alumno) — detalle

### 6.1 Estructura

Una sola página con dos secciones:

1. **Mis clases inscriptas** (arriba) — cards/lista de clases donde ya está inscripto con botón de cancelar
2. **Clases disponibles** (abajo) — clases con cupo, filtro por día, botón de inscribirse

Esto reemplaza la navegación entre Actividades (ver) e Inscripciones (gestionar), unificando en un solo lugar.

## 7. Tests

### 7.1 Eliminar
- `app/tests/test_mercadopago.py`
- `app/tests/test_pagos.py`

### 7.2 Mantener sin cambios
- Todos los tests de actividades, turnos, inscripciones, rutinas, ejercicios, evaluaciones, auth

### 7.3 Verificar que sigan pasando
- Correr suite completa después de los cambios para asegurar que nada se rompió

## 8. Lo que NO se toca

- Login / Register
- Sistema de roles y permisos (auth)
- Backend de actividades, turnos, inscripciones, rutinas, ejercicios, evaluaciones
- Modelo de Usuario (quitar solo la relación con pagos si ya no se usa)
- Modelo de Plan (solo quitar `precio_suscripcion`)
