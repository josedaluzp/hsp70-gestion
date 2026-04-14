# HSP-70 Gestión — Bug Fixes, MercadoPago y Mejora UI/UX

**Fecha:** 2026-04-02
**Branch base:** feat/rutinas-ejercicios
**Alcance:** Corrección de bugs, integración de MercadoPago (pago único + suscripciones), mejora UI/UX para alumnos y profesores.

---

## 1. Bug Fixes

### 1.1 Imports faltantes en init_db.py

**Archivo:** `app/init_db.py`
**Problema:** Faltan imports de `Ejercicio`, `Rutina`, `RutinaAsignacion`, `RutinaEjercicio`. Si se ejecuta `init_db.py` directamente, no se crean las tablas de rutinas/ejercicios.
**Fix:** Agregar los imports faltantes.

### 1.2 Build frontend roto

**Archivo:** `frontend/src/pages/admin/Dashboard.tsx`
**Problema:** Imports no usados (`Card`, `Button`) causan error TS6133 en compilación.
**Fix:** Eliminar los imports no usados.

### 1.3 Botón "Seleccionar" sin acción

**Archivo:** `frontend/src/pages/alumno/Pagos.tsx`
**Problema:** El botón "Seleccionar" en el modal de renovación de plan no tiene `onClick`. No se puede comprar un plan.
**Fix:** Se reemplaza por el flujo completo de MercadoPago (sección 3).

### 1.4 Admin no puede ver rutinas

**Archivo:** `app/api/rutinas.py`
**Problema:** `list_rutinas` solo permite rol `PROFESOR`. Admins no pueden acceder.
**Fix:** Agregar `ADMIN` a la lista de roles permitidos.

---

## 2. Cambios en el modelo de datos

### 2.1 Modelo Plan — Nuevo campo

```python
# app/models/plan.py
precio_suscripcion: Mapped[float | None]  # Numeric(10,2), nullable
```

Si es `None`, el plan no ofrece suscripción. El admin configura ambos precios desde su panel.

### 2.2 Modelo Pago — Nuevos campos

```python
# app/models/pago.py
tipo_pago: Mapped[TipoPago]            # default: UNICO
mp_subscription_id: Mapped[str | None]  # max 100 chars
```

### 2.3 Nuevo enum TipoPago

```python
# app/models/enums.py
class TipoPago(str, Enum):
    UNICO = "unico"
    SUSCRIPCION = "suscripcion"
```

### 2.4 Schemas actualizados

**PlanCreate / PlanUpdate:**
- Agregar `precio_suscripcion: float | None` (gt=0, optional)

**PlanRead:**
- Incluir `precio_suscripcion`

**PagoCreate / PagoRead:**
- Agregar `tipo_pago: TipoPago` (default: UNICO)
- Agregar `mp_subscription_id: str | None`

### 2.5 Configuración — Nuevas variables de entorno

```env
MP_ACCESS_TOKEN=          # Token privado del SDK (ya existe, se mantiene)
MP_PUBLIC_KEY=            # Clave pública para identificar la app
MP_WEBHOOK_SECRET=        # Secret para validar firma HMAC de webhooks
```

---

## 3. Backend — Integración MercadoPago

### 3.1 Nuevo servicio: `app/services/mercadopago_service.py`

Funciones del servicio:

- `create_preference(plan, alumno)` — Crea una preferencia de Checkout Pro en MP. Retorna la URL de checkout (`init_point`). Items: nombre del plan, precio, cantidad 1. URLs de retorno: success/failure/pending apuntando a `/api/mp/callback`.

- `create_subscription(plan, alumno)` — Crea un preapproval en MP para débito automático. Usa `precio_suscripcion` del plan. Frecuencia mensual. Retorna URL para que el alumno autorice.

- `cancel_subscription(mp_subscription_id)` — Llama a la API de MP para cancelar el preapproval. Retorna confirmación.

- `handle_payment_webhook(payload)` — Recibe notificación de pago. Consulta el pago en MP por ID. Actualiza estado del Pago en DB (aprobado/rechazado). Si es aprobado, calcula `fecha_vencimiento = hoy + plan.duracion_dias`.

- `handle_subscription_webhook(payload)` — Recibe notificación de suscripción. Actualiza estado. Si es cobro aprobado, crea nuevo registro de Pago con `tipo_pago=SUSCRIPCION` y calcula vencimiento.

- `get_payment_info(mp_payment_id)` — Consulta el estado de un pago en MP. Útil para verificación manual.

### 3.2 Nuevo router: `app/api/mercadopago.py`

**Pago único:**
```
POST /api/mp/crear-preferencia
  Body: { plan_id: int }
  Auth: Alumno (JWT)
  Response: { checkout_url: str, pago_id: int }
  Lógica: Crea Pago con estado PENDIENTE + tipo UNICO, crea preferencia en MP, guarda mp_payment_id, retorna URL.
```

**Suscripción:**
```
POST /api/mp/crear-suscripcion
  Body: { plan_id: int }
  Auth: Alumno (JWT)
  Response: { checkout_url: str, pago_id: int }
  Lógica: Valida que plan tiene precio_suscripcion. Crea Pago con estado PENDIENTE + tipo SUSCRIPCION, crea preapproval en MP, guarda mp_subscription_id, retorna URL.
```

**Cancelar suscripción:**
```
POST /api/mp/cancelar-suscripcion/{pago_id}
  Auth: Alumno (dueño) o Admin
  Response: { message: str }
  Lógica: Busca pago, valida que es suscripción activa, cancela en MP. El pago mantiene estado APROBADO hasta fecha_vencimiento (el sistema de vencimientos existente lo expira). Se marca mp_subscription_id como cancelado para que no se muestre el badge de "débito automático activo".
```

**Webhook:**
```
POST /api/mp/webhook
  Auth: Sin JWT — público. Valida firma HMAC con MP_WEBHOOK_SECRET.
  Lógica: Determina tipo de notificación (payment/subscription). Delega a handle_payment_webhook o handle_subscription_webhook.
```

**Callback:**
```
GET /api/mp/callback
  Query params: status, payment_id, external_reference
  Lógica: Redirige al frontend con el status → /pagos?status={approved|pending|failure}
```

### 3.3 Registro del router

Agregar `mercadopago_router` en `app/main.py`.

---

## 4. Frontend — Flujo de pago del alumno

### 4.1 Modal de renovación rediseñado (`alumno/Pagos.tsx`)

El modal actual se extiende para soportar el flujo completo:

1. **Selección de plan:** Lista de planes con dos columnas de precio:
   - "Pago único: $15.000"
   - "Suscripción: $12.000/mes" con badge "Ahorrás X%"
   - Si el plan no tiene `precio_suscripcion`, solo muestra pago único

2. **Selección de método:** Dos opciones claras:
   - "Pagar con MercadoPago" (botón principal, destacado)
   - "Pagar en persona" (texto secundario: "Acercate a recepción para pagar en efectivo o transferencia")

3. **Acción:** Al clickear "Pagar con MercadoPago":
   - Llama a `POST /api/mp/crear-preferencia` o `POST /api/mp/crear-suscripcion` según tipo elegido
   - Muestra loader
   - Redirige a la URL de checkout de MP

### 4.2 Estados de retorno

Leer `?status` de los query params al cargar la página:

- `approved` → Toast/banner verde: "Pago aprobado. Tu membresía está activa."
- `pending` → Toast/banner amarillo: "Tu pago está siendo procesado. Te avisaremos cuando se confirme."
- `failure` → Toast/banner rojo: "El pago no se pudo procesar. Podés intentar de nuevo."

Limpiar el query param después de mostrar el mensaje.

### 4.3 Suscripción activa

Si el alumno tiene un pago con `tipo_pago=SUSCRIPCION` y `estado=APROBADO`:

- Badge "Débito automático activo" junto al estado de membresía
- Botón "Cancelar suscripción" visible
- Al clickear: modal de confirmación → "¿Seguro? Tu membresía seguirá activa hasta {fecha_vencimiento} pero no se renovará automáticamente"
- Confirmar → `POST /api/mp/cancelar-suscripcion/{pago_id}`

### 4.4 API service

Agregar en `frontend/src/services/alumnoApi.ts`:

```typescript
mercadopago: {
  crearPreferencia: (planId: number) => api.post('/mp/crear-preferencia', { plan_id: planId }),
  crearSuscripcion: (planId: number) => api.post('/mp/crear-suscripcion', { plan_id: planId }),
  cancelarSuscripcion: (pagoId: number) => api.post(`/mp/cancelar-suscripcion/${pagoId}`),
}
```

---

## 5. Mejora UI/UX para alumnos y profesores

### 5.1 Principios de diseño

- **Lenguaje simple y directo** — "Tu plan", "Próximas clases", "Renovar", nunca jerga técnica
- **Acciones claras** — Iconos + texto siempre, nunca solo iconos
- **Feedback visual** — Loaders, toasts, estados con colores intuitivos (verde=bien, amarillo=pendiente, rojo=problema)
- **Navegación reducida** — Solo las opciones que el rol necesita
- **Mobile-first** — Muchos alumnos acceden desde el celular

### 5.2 Sistema de diseño

Se genera con UI/UX Pro Max un sistema de diseño orientado a fitness/salud premium:
- Paleta de colores coherente con centro de salud
- Tipografía legible y moderna
- Espaciado generoso
- Componentes con estados claros

### 5.3 Páginas del alumno

**Dashboard:**
- Estado de membresía grande y prominente (activa con días restantes / vencida con CTA de renovar)
- Próximas clases del día
- Accesos rápidos (Pagos, Rutinas, Clases)

**Pagos:**
- Flujo de pago simplificado (cubierto en sección 4)
- Historial con estados claros y colores
- Mobile: cards en vez de tabla

**Rutinas:**
- Visualización clara de ejercicios con instrucciones simples
- Agrupados por día o rutina asignada

### 5.4 Páginas del profesor

**Dashboard:**
- Clases del día con horarios y cantidad de alumnos
- Lista de alumnos por clase

**Rutinas:**
- Interfaz intuitiva para crear y asignar rutinas
- Búsqueda de ejercicios por nombre/grupo muscular
- Drag & drop o interfaz simple para armar la rutina

### 5.5 Lo que NO se toca

- **Panel de admin** — Usado por gente técnica, se mantiene como está
- **Panel de recepcionista** — Ya funcional para su flujo actual

---

## 6. Guía de setup de MercadoPago

### 6.1 Crear cuenta de desarrollador

1. Ir a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Loguearse con cuenta de MercadoPago (o crear una)
3. Ir a "Tus integraciones" → "Crear aplicación"
4. Nombre: "HSP-70 Gestión"
5. Seleccionar: "Checkout Pro" y "Subscriptions"
6. Crear

### 6.2 Obtener credenciales de test

1. Dentro de la aplicación creada → "Credenciales de prueba"
2. Copiar `PUBLIC_KEY` y `ACCESS_TOKEN` del sandbox
3. Estas credenciales solo funcionan con usuarios de prueba

### 6.3 Crear usuarios de prueba

1. En la app de MP → "Cuentas de prueba"
2. Crear un comprador de prueba y un vendedor de prueba
3. El vendedor es tu app, el comprador simula al alumno

### 6.4 Configurar .env

```env
MP_ACCESS_TOKEN=TEST-xxxx-xxxx-xxxx
MP_PUBLIC_KEY=TEST-xxxx-xxxx-xxxx
MP_WEBHOOK_SECRET=  # Se configura al registrar el webhook
```

### 6.5 Configurar webhook con ngrok

1. Instalar ngrok: `npm install -g ngrok` o descargar de ngrok.com
2. Ejecutar: `ngrok http 8000` (asumiendo backend en puerto 8000)
3. Copiar la URL pública (ej: `https://abc123.ngrok.io`)
4. En MP Developers → Tu app → "Webhooks" → Agregar URL: `https://abc123.ngrok.io/api/mp/webhook`
5. Seleccionar eventos: `payment`, `subscription_preapproval`
6. Copiar el secret generado → Pegar en `MP_WEBHOOK_SECRET` del `.env`

### 6.6 Tarjetas de prueba

MercadoPago provee tarjetas ficticias para testing:
- **Aprobado:** Visa 4509 9535 6623 3704, CVV 123, vencimiento cualquiera futuro
- **Rechazado:** Mastercard 5031 7557 3453 0604
- Documentación completa en la guía de MP

### 6.7 Flujo de test completo

1. Iniciar backend + frontend
2. Loguearse como alumno de prueba
3. Ir a Pagos → Renovar plan → Elegir plan → "Pagar con MercadoPago"
4. En la página de MP usar tarjeta de prueba
5. Verificar redirect de vuelta con status correcto
6. Verificar que el webhook actualizó el pago en DB
7. Repetir con suscripción

---

## 7. Testing

### 7.1 Tests de backend

- Tests unitarios del servicio `mercadopago_service.py` mockeando el SDK de MP
- Tests de endpoints: crear preferencia, crear suscripción, cancelar suscripción
- Test de webhook: simular payload de MP con firma válida e inválida
- Test de migración: verificar que los nuevos campos se crean correctamente
- Tests de los bug fixes (init_db imports, rutinas admin access)

### 7.2 Tests de integración

- Flujo completo: crear preferencia → simular webhook → verificar pago aprobado
- Flujo suscripción: crear → simular cobro → verificar nuevo pago creado
- Cancelación: cancelar suscripción → verificar estado actualizado

---

## 8. Resumen de archivos a modificar/crear

### Modificar:
- `app/models/plan.py` — Agregar `precio_suscripcion`
- `app/models/pago.py` — Agregar `tipo_pago`, `mp_subscription_id`
- `app/models/enums.py` — Agregar enum `TipoPago`
- `app/schemas/plan.py` — Actualizar schemas con `precio_suscripcion`
- `app/schemas/pago.py` — Actualizar schemas con nuevos campos
- `app/core/config.py` — Agregar `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
- `app/main.py` — Registrar nuevo router
- `app/init_db.py` — Agregar imports faltantes (bug fix)
- `app/api/rutinas.py` — Agregar ADMIN a list_rutinas (bug fix)
- `frontend/src/pages/admin/Dashboard.tsx` — Eliminar imports no usados (bug fix)
- `frontend/src/pages/alumno/Pagos.tsx` — Flujo de pago completo + mejora UI/UX
- `frontend/src/services/alumnoApi.ts` — Agregar endpoints de MP

### Crear:
- `app/services/mercadopago_service.py` — Servicio de integración con MP
- `app/api/mercadopago.py` — Router de endpoints de MP
- Tests correspondientes

### No tocar:
- `.env` — No se commitea, solo se documenta
- `app/services/pago_service.py` — El flujo manual sigue funcionando sin cambios
- `app/api/pagos.py` — Los endpoints manuales no cambian
- Panel de admin y recepcionista — Sin cambios de UI
