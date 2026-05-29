# Design — Migración a Auth0

**Fecha:** 2026-05-29
**Tipo:** Sub-proyecto 2 de 3 — `Auth con Auth0`
**Estado:** Aprobado, pendiente de plan de implementación
**Fuente de verdad:** [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (ver §8 Auth, D2, D5)

---

## 1. Contexto

El auth actual usa **Supabase Auth**:

- Identidad 1:1: `usuarios.id` = `auth.users.id` (FK `ON DELETE CASCADE`).
- Un trigger `on_auth_user_created` sobre `auth.users` crea la fila `usuarios`
  (`rol='alumno'`) con los metadatos del signup (`008_triggers.sql`).
- Login: frontend `supabase.auth.signInWithPassword` → JWT de Supabase.
- Registro: endpoint propio `/api/auth/register` → `adminClient.auth.admin.createUser`.
- Verificación en API: `adminClient.auth.getUser(token)` valida el JWT y luego se
  consulta `usuarios` para `rol` + `activo` (`api/_lib/auth.ts`).
- Roles: viven en `usuarios.rol` (la BD es autoritativa). El API usa service-role
  key, así que **no depende de RLS**.
- La página admin de Usuarios **ya permite editar el rol** de un usuario.

## 2. Objetivo

Reemplazar el **proveedor de identidad** (Supabase Auth → **Auth0**) manteniendo
Supabase como **base de datos**. Login estándar (email+password, verificación de
email, reset, Google), con Auth0 enviando sus emails a través de **Resend**.

### No-objetivos (YAGNI)

- Migración masiva de usuarios (no existen; ver §9).
- Creación de usuarios desde el admin vía Auth0 Management API (alcanza
  self-register + editar rol en el panel).
- Emails propios de la app vía Resend SDK (notificaciones) — futuro.
- RBAC con roles en Auth0 (los roles siguen en la BD — ver Enfoque, §3).

## 3. Enfoque elegido

**Provider-agnostic, BD autoritativa.** La app solo redirige al Universal Login
de Auth0; la API valida el JWT de Auth0 contra su JWKS; los roles siguen en
`usuarios.rol`; la identidad se desacopla con una columna `auth0_sub`.

Descartado — **Roles en Auth0 (RBAC):** partiría la gestión de roles fuera de la
app (la página de Usuarios dejaría de cambiar roles) sin beneficio en este contexto.

## 4. Métodos de login

- **Base (habilitado desde el arranque):** email + contraseña, verificación de
  email, recuperar contraseña, **Continuar con Google**.
- **Toggles de config (sin código adicional):** MFA/2FA y passwordless (magic
  link). Se activan en el dashboard de Auth0 cuando se quiera.

La app **no codea cada método**: usa Universal Login (redirect), por lo que los
métodos habilitados son configuración de Auth0.

## 5. Cambios de esquema (migración SQL nueva: `011_auth0.sql`)

```sql
-- Desacoplar identidad del proveedor de auth
ALTER TABLE usuarios ADD COLUMN auth0_sub text UNIQUE;
ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Quitar la dependencia de Supabase Auth
ALTER TABLE usuarios DROP CONSTRAINT usuarios_id_fkey;  -- FK a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
```

- `usuarios.id` **sigue siendo la PK UUID**; todas las FKs (`alumno_id`,
  `profesor_id`, etc.) quedan intactas.
- `auth0_sub` guarda el `sub` de Auth0 (`auth0|...` o `google-oauth2|...`).
- El nombre real de la constraint FK (`usuarios_id_fkey`) se confirma en el plan
  con `\d usuarios` antes de ejecutar.

## 6. Verificación de token en la API

Reescribir `frontend/api/_lib/auth.ts`:

- Validar el JWT **RS256** contra el **JWKS** de Auth0
  (`https://<AUTH0_DOMAIN>/.well-known/jwks.json`) verificando `issuer`
  (`https://<AUTH0_DOMAIN>/`) y `audience` (`AUTH0_AUDIENCE`), con la librería
  **`jose`** (`createRemoteJWKSet` cachea las claves).
- Tras validar: `sub` del token → buscar `usuarios` por `auth0_sub` → `rol` +
  `activo`. Si `!activo`, rechazar.
- **Lazy provisioning:** si no existe fila para ese `sub`, crearla desde los
  claims del token (`email`, `name`/`nombre`) con `rol='alumno'` y guardar
  `auth0_sub`. Devolver el usuario recién creado.
- `requireAuth(req, res)` y `requireRole(req, res, [roles])` mantienen su firma
  (los handlers no cambian).

**Requisito Auth0:** registrar una **API** con identifier (audience), p.ej.
`https://api.hsp70`. El frontend debe pedir ese `audience` para recibir un access
token JWT (sin audience, Auth0 emite tokens opacos no verificables por JWKS).

## 7. Integración frontend

- Dependencia: `@auth0/auth0-react`. Quitar `@supabase/supabase-js` del frontend
  (solo se usaba para auth; el frontend no accede a la BD directamente).
- `Auth0Provider` envuelve la app (`main.tsx`) con `domain`, `clientId`,
  `authorizationParams: { audience, redirect_uri }`, `cacheLocation`/refresh tokens
  según necesidad.
- Reescribir `AuthContext` para apoyarse en el SDK:
  - `login()` → `loginWithRedirect()`; signup → `loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })`.
  - `logout()` → `auth0.logout({ logoutParams: { returnTo } })`.
  - Token para el `Bearer`: `getAccessTokenSilently()` en `fetchWithToken`.
  - Perfil de negocio: se mantiene `GET /auth/me` (devuelve la fila `usuarios`:
    rol, créditos, etc.). El `User` de la app sigue saliendo de la BD, no del token.
  - Estado: derivar `loading`/`user` de `isLoading`/`isAuthenticated` + `/auth/me`.
- `Login.tsx` / `Register.tsx`: botones que disparan `loginWithRedirect` (login y
  signup) — diseño claro "amp" (D3). `ProtectedRoute` mantiene su lógica
  (`loading` → spinner; sin user → `/login`; rol no permitido → `/`).
- **Onboarding:** página in-app que, tras el primer login, permite completar
  `telefono`, `dni`, `fecha_nacimiento` (campos no provistos por Auth0). Editables
  luego en Perfil.

## 8. Email con Resend

Configurar **Resend como SMTP custom de Auth0** (no requiere código):

1. En Resend: verificar el dominio de envío (registros DNS SPF/DKIM).
2. En Auth0 → Branding → Email Provider → **SMTP**:
   - Host: `smtp.resend.com`
   - Port: `465` (o `587`)
   - Username: `resend`
   - Password: API key de Resend
   - From: dirección del dominio verificado.
3. Verificación de email, reset de contraseña y magic link salen por Resend.

Queda documentado como checklist de ops en el plan.

## 9. Configuración, secrets y cuenta admin

Variables de entorno nuevas:

| Var | Dónde | Uso |
|-----|-------|-----|
| `VITE_AUTH0_DOMAIN` | Frontend | dominio del tenant |
| `VITE_AUTH0_CLIENT_ID` | Frontend | SPA client |
| `VITE_AUTH0_AUDIENCE` | Frontend | identifier de la API Auth0 |
| `AUTH0_DOMAIN` | API | derivar issuer + JWKS |
| `AUTH0_AUDIENCE` | API | validar `aud` |

Se eliminan del flujo de auth: `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` en el
frontend (la API conserva `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` para la BD).

**Cuenta admin (la única real):** el usuario se loguea una vez por Auth0 → lazy
provisioning crea su fila `usuarios` (`alumno`) → se promueve a `admin` con un
bootstrap único (UPDATE puntual por email, documentado en el plan). El resto de
las cuentas se agregan luego por self-register y se les asigna rol desde el panel.

## 10. Limpieza

- Eliminar `frontend/api/_handlers/auth/register.ts` y su ruta en `[...path].ts`.
- Eliminar `frontend/src/lib/supabase.ts` (cliente anon) y la dependencia
  `@supabase/supabase-js` del `package.json` del frontend.
- Eliminar usos de `supabase.auth.*` en `AuthContext`.

## 11. Testing

Vitest (ya configurado):

- **API:** verificación de JWT con un token de prueba firmado por una clave RSA de
  test y un JWKS mockeado (issuer/audience correctos e incorrectos); mapeo
  `sub → usuarios`; lazy provisioning (crea fila cuando no existe); rechazo si
  `!activo`; `requireRole` (403 si el rol no está permitido).
- **Frontend:** `AuthContext` (estados loading/authenticated, header Bearer);
  `ProtectedRoute` (redirect sin sesión y por rol). El SDK de Auth0 se mockea.

## 12. Criterios de éxito

- Un usuario nuevo se registra/loguea por Auth0 (email/pass o Google), recibe los
  emails por Resend, y queda con una fila `usuarios` (`alumno`) operativa.
- La API valida tokens de Auth0 vía JWKS y resuelve `rol`/`activo` desde la BD.
- El admin puede cambiar el rol de cualquier usuario desde el panel.
- No queda código de Supabase Auth en el frontend ni en la verificación de la API.
- La cuenta del usuario queda como `admin`.
- Tests verdes para verificación de token, provisioning y protección por rol.

## 13. Riesgos / notas

- **Audience obligatorio:** sin `audience` configurado y solicitado, Auth0 emite
  tokens opacos → la verificación por JWKS falla. Es el error de integración más
  común; el plan lo verifica explícitamente.
- **Dominio Resend:** la verificación DNS puede tardar; hasta entonces se puede
  operar con el email default de Auth0 (dev).
- **Decisión de roles (D4):** la eliminación de `recepcionista` del enum es un
  ítem aparte agendado en `docs/PLAN.md`; este sub-proyecto no la ejecuta, pero el
  tipo `User` del frontend deja de usar ese valor en la práctica.
