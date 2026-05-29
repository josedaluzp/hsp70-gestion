# Auth0 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar Supabase Auth por Auth0 como proveedor de identidad, manteniendo Supabase como base de datos, con login estándar y emails vía Resend.

**Architecture:** Universal Login (redirect + PKCE) en el frontend con `@auth0/auth0-react`; la API valida el JWT de Auth0 contra su JWKS con `jose`; los roles siguen en `usuarios.rol`; la identidad se desacopla con `usuarios.auth0_sub`; provisioning lazy con relink por email en el primer login.

**Tech Stack:** React 19 + TS + Vite, `@auth0/auth0-react`, Vercel serverless, `jose`, Supabase (Postgres), Vitest.

**Spec:** `docs/planes/2026-05-29-auth0-migration-design.md`
**Branch:** `feat/auth0-migration` (ya creada)

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---------|-----------------|--------|
| `frontend/supabase/migrations/011_auth0.sql` | Desacopla identidad (auth0_sub, drop FK/trigger) | Crear (Task 1) |
| `frontend/api/_lib/auth0.ts` | Verifica JWT de Auth0 vía JWKS | Crear (Task 3) |
| `frontend/api/_lib/auth.ts` | verifyToken: mapea sub→usuarios + provisioning | Reescribir (Task 4) |
| `frontend/api/_lib/__tests__/auth.test.ts` | Tests de verifyToken | Reescribir (Task 4) |
| `frontend/api/_lib/__tests__/auth0.test.ts` | Tests de verifyAuth0Token | Crear (Task 3) |
| `frontend/api/_handlers/auth/register.ts` + ruta | Alta vía Supabase (obsoleto) | Eliminar (Task 5) |
| `frontend/src/services/authToken.ts` | Puente token Auth0 → servicios | Crear (Task 6) |
| `frontend/src/services/api.ts` | Origen del token de las llamadas | Modificar (Task 6) |
| `frontend/src/context/authTypes.ts` | Tipos de AuthState | Modificar (Task 7) |
| `frontend/src/context/AuthContext.tsx` | Provider sobre `@auth0/auth0-react` | Reescribir (Task 7) |
| `frontend/src/main.tsx` | Envolver con `Auth0Provider` | Modificar (Task 7) |
| `frontend/src/pages/Login.tsx`, `Register.tsx` | Disparar `loginWithRedirect` | Reescribir (Task 8) |
| `frontend/src/components/ProtectedRoute.tsx` | Usa nuevo AuthState | Verificar/ajustar (Task 8) |
| `frontend/src/pages/Onboarding.tsx` + ruta | Completa perfil tras 1er login | Crear (Task 8) |
| `frontend/src/lib/supabase.ts` + dep | Cliente anon (obsoleto) | Eliminar (Task 9) |
| `.env.example`, `ARCHITECTURE.md` | Config + doc | Modificar (Task 10) |

> **Nota sobre tests de frontend:** el proyecto no tiene infraestructura de tests de componentes React (vitest está en `environment: 'node'`, coverage sobre `api/**`, sin jsdom/testing-library). Montar eso es scope aparte. Por eso las Tasks 3–4 (API, lógica de seguridad) se hacen con **TDD real**, y las Tasks 6–9 (frontend) se verifican con `npm run build` (typecheck) + un **checklist de prueba manual**. Esta desviación es intencional y está alineada con el estado actual del repo.

---

### Task 1: Migración SQL — desacoplar identidad

**Files:**
- Create: `frontend/supabase/migrations/011_auth0.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `frontend/supabase/migrations/011_auth0.sql` con:

```sql
-- 011_auth0.sql — Desacoplar identidad de Supabase Auth, preparar para Auth0

-- 1. Columna para el identificador externo de Auth0 (sub)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth0_sub text UNIQUE;

-- 2. id deja de depender de auth.users: lo genera la app
ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Quitar la FK a auth.users (el nombre por defecto es usuarios_id_fkey;
--    confirmar con \d usuarios si difiere)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_id_fkey;

-- 4. Eliminar el trigger y la función que creaban usuarios desde auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
```

- [ ] **Step 2: Confirmar el nombre real de la constraint FK antes de aplicar**

En el SQL editor de Supabase, ejecutar:
```sql
SELECT conname FROM pg_constraint
WHERE conrelid = 'usuarios'::regclass AND contype = 'f';
```
Si aparece un nombre distinto a `usuarios_id_fkey` para la FK que referencia
`auth.users`, ajustar el `DROP CONSTRAINT` del Step 1 con ese nombre.

- [ ] **Step 3: Aplicar la migración en Supabase**

Pegar el contenido de `011_auth0.sql` en el SQL editor del proyecto Supabase y
ejecutarlo. Verificar que `usuarios` ahora tiene `auth0_sub` y que el trigger
`on_auth_user_created` ya no existe:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'auth0_sub';
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
Expected: la primera devuelve `auth0_sub`; la segunda, 0 filas.

- [ ] **Step 4: Commit**

```bash
git add frontend/supabase/migrations/011_auth0.sql
git commit -m "feat(auth): add migration to decouple identity for Auth0"
```

---

### Task 2: Instalar dependencias

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Instalar `jose` (API) y `@auth0/auth0-react` (frontend)**

Run (desde `frontend/`):
```bash
npm install jose @auth0/auth0-react
```
Expected: ambos quedan en `dependencies` de `frontend/package.json`.

- [ ] **Step 2: Verificar**

Run: `node -e "require('jose'); console.log('jose ok')"`
Expected: `jose ok`

Run: `node -e "const p=require('./package.json'); console.log(!!p.dependencies.jose, !!p.dependencies['@auth0/auth0-react'])"`
Expected: `true true`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(auth): add jose and @auth0/auth0-react dependencies"
```

---

### Task 3: `auth0.ts` — verificación de JWT contra JWKS (TDD)

**Files:**
- Create: `frontend/api/_lib/auth0.ts`
- Test: `frontend/api/_lib/__tests__/auth0.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `frontend/api/_lib/__tests__/auth0.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'JWKS'),
  jwtVerify: vi.fn(),
}))

import { jwtVerify } from 'jose'
import { verifyAuth0Token } from '../auth0'

describe('verifyAuth0Token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTH0_DOMAIN = 'tenant.us.auth0.com'
    process.env.AUTH0_AUDIENCE = 'https://api.hsp70'
  })

  it('returns sub + payload when jose verifies the token', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|1', foo: 'bar' } } as any)
    const result = await verifyAuth0Token('good')
    expect(result).toEqual({ sub: 'auth0|1', payload: { sub: 'auth0|1', foo: 'bar' } })
  })

  it('passes the correct issuer and audience to jwtVerify', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: 'auth0|1' } } as any)
    await verifyAuth0Token('good')
    expect(jwtVerify).toHaveBeenCalledWith('good', 'JWKS', {
      issuer: 'https://tenant.us.auth0.com/',
      audience: 'https://api.hsp70',
    })
  })

  it('returns null when jose throws (invalid token)', async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error('invalid signature'))
    const result = await verifyAuth0Token('bad')
    expect(result).toBeNull()
  })

  it('returns null when payload has no sub', async () => {
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { foo: 'bar' } } as any)
    const result = await verifyAuth0Token('nosub')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_lib/__tests__/auth0.test.ts`
Expected: FAIL — `Cannot find module '../auth0'`.

- [ ] **Step 3: Implementar `auth0.ts`**

Crear `frontend/api/_lib/auth0.ts`:

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

export interface Auth0Claims {
  sub: string
  payload: JWTPayload
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks(domain: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`))
  }
  return jwks
}

export async function verifyAuth0Token(token: string): Promise<Auth0Claims | null> {
  const domain = process.env.AUTH0_DOMAIN
  const audience = process.env.AUTH0_AUDIENCE
  if (!domain || !audience) {
    throw new Error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE')
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(domain), {
      issuer: `https://${domain}/`,
      audience,
    })
    if (!payload.sub) return null
    return { sub: payload.sub, payload }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_lib/__tests__/auth0.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_lib/auth0.ts frontend/api/_lib/__tests__/auth0.test.ts
git commit -m "feat(auth): add Auth0 JWT verification via JWKS"
```

---

### Task 4: Reescribir `auth.ts` — mapeo sub→usuarios + provisioning (TDD)

**Files:**
- Modify: `frontend/api/_lib/auth.ts` (reescritura completa)
- Modify: `frontend/api/_lib/__tests__/auth.test.ts` (reescritura completa)

- [ ] **Step 1: Reescribir el test que falla**

Reemplazar TODO el contenido de `frontend/api/_lib/__tests__/auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../auth0', () => ({ verifyAuth0Token: vi.fn() }))
vi.mock('../supabase', () => ({ adminClient: { from: vi.fn() } }))

import { verifyAuth0Token } from '../auth0'
import { adminClient } from '../supabase'
import { verifyToken } from '../auth'

const mockReq = (token?: string) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
} as any)

// Builds a chainable mock for adminClient.from('usuarios')
function mockUsuarios(opts: {
  byEmail?: any            // row returned by .select().eq('email').maybeSingle()
  insertResult?: any       // row returned by .insert().select().single()
  updateResult?: any       // row returned by .update().eq().select().single()
}) {
  vi.mocked(adminClient.from).mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: opts.byEmail ?? null, error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: opts.insertResult ?? null, error: opts.insertResult ? null : new Error('x') }),
      }),
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: opts.updateResult ?? null, error: opts.updateResult ? null : new Error('x') }),
        }),
      }),
    }),
  } as any)
}

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTH0_DOMAIN = 'tenant.us.auth0.com'
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns null when no authorization header', async () => {
    expect(await verifyToken(mockReq())).toBeNull()
  })

  it('returns null when the Auth0 token is invalid', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue(null)
    expect(await verifyToken(mockReq('bad'))).toBeNull()
  })

  it('returns the existing user mapped by auth0_sub', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|1', payload: {} } as any)
    // First .from() call: lookup by auth0_sub
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: { id: 'u1', rol: 'admin', activo: true }, error: null }) }) }),
    } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u1', rol: 'admin', activo: true })
  })

  it('returns null when the mapped user is inactive', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|1', payload: {} } as any)
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () =>
        Promise.resolve({ data: { id: 'u1', rol: 'alumno', activo: false }, error: null }) }) }),
    } as any)
    expect(await verifyToken(mockReq('good'))).toBeNull()
  })

  it('provisions by relinking an existing row with matching email (preserves rol)', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    // 1st from(): lookup by auth0_sub → not found
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    } as any)
    // userinfo returns the email of an existing seed admin
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () =>
      Promise.resolve({ email: 'admin@hsp70.com', name: 'Admin User' }) })
    // 2nd from(): lookup by email → existing row with rol admin and no auth0_sub
    // 3rd from(): update → returns the relinked row
    vi.mocked(adminClient.from)
      .mockReturnValueOnce({
        select: () => ({ eq: () => ({ maybeSingle: () =>
          Promise.resolve({ data: { id: 'u9', rol: 'admin', activo: true, auth0_sub: null }, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({
        update: () => ({ eq: () => ({ select: () => ({ single: () =>
          Promise.resolve({ data: { id: 'u9', rol: 'admin', activo: true }, error: null }) }) }) }),
      } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u9', rol: 'admin', activo: true })
  })

  it('provisions a new alumno when no row exists for the email', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () =>
      Promise.resolve({ email: 'nuevo@x.com', given_name: 'Ana', family_name: 'Gómez' }) })
    vi.mocked(adminClient.from)
      .mockReturnValueOnce({ // lookup by auth0_sub → none
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({ // lookup by email → none
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      } as any)
      .mockReturnValueOnce({ // insert → new row
        insert: () => ({ select: () => ({ single: () =>
          Promise.resolve({ data: { id: 'u10', rol: 'alumno', activo: true }, error: null }) }) }),
      } as any)
    const result = await verifyToken(mockReq('good'))
    expect(result).toEqual({ id: 'u10', rol: 'alumno', activo: true })
  })

  it('returns null when userinfo has no email', async () => {
    vi.mocked(verifyAuth0Token).mockResolvedValue({ sub: 'auth0|new', payload: {} } as any)
    vi.mocked(adminClient.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    } as any)
    vi.mocked(fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    expect(await verifyToken(mockReq('good'))).toBeNull()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `frontend/`): `npx vitest run api/_lib/__tests__/auth.test.ts`
Expected: FAIL (la implementación aún usa Supabase Auth / firmas viejas).

- [ ] **Step 3: Reescribir `auth.ts`**

Reemplazar TODO el contenido de `frontend/api/_lib/auth.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminClient } from './supabase'
import { verifyAuth0Token } from './auth0'
import type { AuthenticatedUser, RolUsuario } from './types'
import { unauthorized, forbidden } from './errors'

function bearer(req: VercelRequest): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

interface UserInfo {
  email?: string
  name?: string
  given_name?: string
  family_name?: string
}

async function fetchUserInfo(token: string): Promise<UserInfo | null> {
  const domain = process.env.AUTH0_DOMAIN
  if (!domain) return null
  const res = await fetch(`https://${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<UserInfo>
}

function splitName(info: UserInfo): { nombre: string; apellido: string } {
  const nombre = info.given_name ?? info.name?.split(' ')[0] ?? 'Usuario'
  const apellido = info.family_name ?? info.name?.split(' ').slice(1).join(' ') ?? ''
  return { nombre, apellido }
}

function toAuthUser(row: { id: string; rol: string; activo: boolean }): AuthenticatedUser | null {
  if (!row.activo) return null
  return { id: row.id, rol: row.rol as RolUsuario, activo: row.activo }
}

// First login: relink an existing row by email (preserving its rol), or create a new alumno.
async function provisionUser(sub: string, token: string): Promise<AuthenticatedUser | null> {
  const info = await fetchUserInfo(token)
  if (!info?.email) return null

  const { data: existing } = await adminClient
    .from('usuarios')
    .select('id, rol, activo, auth0_sub')
    .eq('email', info.email)
    .maybeSingle()

  if (existing) {
    if (existing.auth0_sub && existing.auth0_sub !== sub) return null // email taken by another identity
    const { data: relinked, error } = await adminClient
      .from('usuarios')
      .update({ auth0_sub: sub })
      .eq('id', existing.id)
      .select('id, rol, activo')
      .single()
    if (error || !relinked) return null
    return toAuthUser(relinked)
  }

  const { nombre, apellido } = splitName(info)
  const { data: created, error } = await adminClient
    .from('usuarios')
    .insert({ auth0_sub: sub, email: info.email, nombre, apellido, rol: 'alumno' })
    .select('id, rol, activo')
    .single()
  if (error || !created) return null
  return toAuthUser(created)
}

export async function verifyToken(req: VercelRequest): Promise<AuthenticatedUser | null> {
  const token = bearer(req)
  if (!token) return null

  const claims = await verifyAuth0Token(token)
  if (!claims) return null

  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('id, rol, activo')
    .eq('auth0_sub', claims.sub)
    .maybeSingle()

  if (usuario) return toAuthUser(usuario)

  return provisionUser(claims.sub, token)
}

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthenticatedUser | null> {
  const user = await verifyToken(req)
  if (!user) {
    unauthorized(res)
    return null
  }
  return user
}

export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  roles: RolUsuario[],
): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req, res)
  if (!user) return null
  if (!roles.includes(user.rol)) {
    forbidden(res)
    return null
  }
  return user
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run (desde `frontend/`): `npx vitest run api/_lib/__tests__/auth.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/api/_lib/auth.ts frontend/api/_lib/__tests__/auth.test.ts
git commit -m "feat(auth): verify Auth0 tokens and provision users by email relink"
```

---

### Task 5: Eliminar el endpoint de registro de Supabase

**Files:**
- Delete: `frontend/api/_handlers/auth/register.ts`
- Modify: `frontend/api/[...path].ts`

- [ ] **Step 1: Eliminar el handler**

Run: `git rm frontend/api/_handlers/auth/register.ts`

- [ ] **Step 2: Quitar el import y la ruta del catch-all**

En `frontend/api/[...path].ts`:
- Eliminar la línea de import: `import authRegister from './_handlers/auth/register'`
- Eliminar la línea de ruta: `if (r0 === 'auth' && r1 === 'register') return authRegister(req, res)`

- [ ] **Step 3: Verificar que no quedan referencias**

Run (desde `frontend/`): `rg "authRegister|auth/register" api/`
Expected: sin resultados (exit code 1).

Run (desde `frontend/`): `npx tsc -p . --noEmit` (o `npm run build` parcial)
Expected: sin errores de tipo por el import eliminado.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): remove Supabase-based register endpoint"
```

---

### Task 6: Puente de token Auth0 para los servicios

**Files:**
- Create: `frontend/src/services/authToken.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Crear el puente de token**

Crear `frontend/src/services/authToken.ts`:

```ts
// Bridge between the Auth0 React SDK (hook-based) and the non-React API client.
// AuthProvider registers Auth0's getAccessTokenSilently here on mount.

type TokenGetter = () => Promise<string>

let getter: TokenGetter | null = null

export function setAccessTokenGetter(fn: TokenGetter): void {
  getter = fn
}

export async function getAccessToken(): Promise<string | null> {
  if (!getter) return null
  try {
    return await getter()
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Actualizar `api.ts` para usar el token de Auth0**

En `frontend/src/services/api.ts`:
- Eliminar `import { supabase } from "../lib/supabase";`
- Agregar `import { getAccessToken } from "./authToken";`
- Reemplazar la función `getToken`:

```ts
async function getToken(): Promise<string | null> {
  return getAccessToken();
}
```

- Reemplazar el bloque de manejo de 401 (que usaba `supabase.auth.signOut()`):

```ts
  if (res.status === 401 && window.location.pathname !== "/login") {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
```

- [ ] **Step 3: Verificar typecheck**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores en `services/api.ts` ni `services/authToken.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/authToken.ts frontend/src/services/api.ts
git commit -m "feat(auth): route API token through Auth0 bridge"
```

---

### Task 7: Auth0Provider + reescritura de AuthContext

**Files:**
- Modify: `frontend/src/context/authTypes.ts`
- Modify: `frontend/src/context/AuthContext.tsx` (reescritura)
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Actualizar `authTypes.ts`**

En `frontend/src/context/authTypes.ts`, reemplazar `AuthState` y eliminar
`RegisterData` (Auth0 maneja el alta). Dejar `User` como está. Nuevo `AuthState`:

```ts
export interface AuthState {
  user: User | null;
  loading: boolean;
  login: () => void;
  signup: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

Eliminar la interfaz `RegisterData` y cualquier `export` de ella.

- [ ] **Step 2: Reescribir `AuthContext.tsx`**

Reemplazar TODO el contenido de `frontend/src/context/AuthContext.tsx`:

```tsx
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext, type User } from "./authTypes";
import { setAccessTokenGetter } from "../services/authToken";

export type { User, AuthState } from "./authTypes";
export { AuthContext } from "./authTypes";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isLoading,
    isAuthenticated,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Register Auth0's token getter for the non-React API client.
  useEffect(() => {
    setAccessTokenGetter(() => getAccessTokenSilently());
  }, [getAccessTokenSilently]);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      setProfileLoading(false);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      setUser(await res.json());
    } catch {
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isLoading) refreshUser();
  }, [isLoading, refreshUser]);

  const login = useCallback(() => {
    void loginWithRedirect();
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    void loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  const loading = isLoading || profileLoading;

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 3: Envolver la app con `Auth0Provider` en `main.tsx`**

Reemplazar TODO el contenido de `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
```

> `scope: "openid profile email"` es necesario para que `/userinfo` (usado en el
> provisioning del backend) devuelva email y nombre. `cacheLocation`/`useRefreshTokens`
> hacen confiable `getAccessTokenSilently` sin cookies de terceros.

- [ ] **Step 4: Verificar typecheck/build**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores. (Login.tsx/Register.tsx pueden romper aquí porque aún usan
la API vieja de AuthContext — se arreglan en Task 8; si `tsc -b` falla solo por
esos archivos, continuar a Task 8 y revalidar al final de la 8.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/authTypes.ts frontend/src/context/AuthContext.tsx frontend/src/main.tsx
git commit -m "feat(auth): wire Auth0Provider and rewrite AuthContext"
```

---

### Task 8: Login / Register / ProtectedRoute / Onboarding

**Files:**
- Modify: `frontend/src/pages/Login.tsx` (reescritura)
- Modify: `frontend/src/pages/Register.tsx` (reescritura)
- Modify: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/pages/Onboarding.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Reescribir `Login.tsx`**

Reemplazar TODO el contenido de `frontend/src/pages/Login.tsx`:

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Button, Spinner } from "../components/ui";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-900">HSP-70</h1>
        <p className="mt-2 text-sm text-neutral-500">Iniciá sesión para acceder a tu panel</p>
      </div>
      <Button size="lg" className="w-full max-w-xs cursor-pointer" onClick={login}>
        Iniciar sesión
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Reescribir `Register.tsx`**

Reemplazar TODO el contenido de `frontend/src/pages/Register.tsx`:

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Button, Spinner } from "../components/ui";

export default function Register() {
  const { user, loading, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-black uppercase tracking-wide text-neutral-900">HSP-70</h1>
        <p className="mt-2 text-sm text-neutral-500">Creá tu cuenta para empezar</p>
      </div>
      <Button size="lg" className="w-full max-w-xs cursor-pointer" onClick={signup}>
        Registrarme
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verificar `ProtectedRoute.tsx`**

`ProtectedRoute` ya usa `user`/`loading` de `useAuth`, que siguen existiendo en el
nuevo `AuthState`. No requiere cambios de lógica. Confirmar que compila leyendo el
archivo; si importa `RegisterData` o algo eliminado, quitarlo (no debería).

- [ ] **Step 4: Crear `Onboarding.tsx`**

Crear `frontend/src/pages/Onboarding.tsx` (completa los campos que Auth0 no provee):

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import api from "../services/api";
import { Button, Input } from "../components/ui";

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/usuarios/${user.id}`, {
        telefono: telefono || null,
        dni: dni || null,
        fecha_nacimiento: fechaNacimiento || null,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch {
      setError("No se pudieron guardar los datos. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wide text-neutral-900">
          Completá tu perfil
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Estos datos nos ayudan a gestionar tu membresía. Podés editarlos luego.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <Input label="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(e.target.value)}
        />
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="cursor-pointer">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            Omitir
          </Button>
        </div>
      </form>
    </div>
  );
}
```

> Usa `PUT /usuarios/:id`, que ya existe (`_handlers/usuarios/id.ts`). Confirmar
> en ese handler que acepta `telefono`/`dni`/`fecha_nacimiento` y que el dueño
> puede editar su propia fila; si solo permite admin, ajustar el handler para
> permitir que un usuario edite su propio registro (comparar `auth.id === id`).

- [ ] **Step 5: Registrar la ruta de Onboarding en `App.tsx`**

En `frontend/src/App.tsx`:
- Agregar el import: `import Onboarding from "./pages/Onboarding";`
- Dentro del bloque `<Route element={<ProtectedRoute />}>` y `<MainLayout />`... NO:
  Onboarding va SIN MainLayout pero protegida. Agregar, dentro del
  `<Route element={<ProtectedRoute />}>` exterior pero ANTES del `<MainLayout />`:

```tsx
<Route path="/onboarding" element={<Onboarding />} />
```

(es decir, como hija directa del `ProtectedRoute` raíz, hermana del `MainLayout`).

- [ ] **Step 6: Verificar build completo**

Run (desde `frontend/`): `npm run build`
Expected: `tsc -b && vite build` termina sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/pages/Onboarding.tsx frontend/src/App.tsx
git commit -m "feat(auth): redirect-based login/register and onboarding page"
```

---

### Task 9: Eliminar el cliente Supabase Auth del frontend

**Files:**
- Delete: `frontend/src/lib/supabase.ts`

> **Importante:** `api/` comparte el `package.json` de `frontend/`, y el backend
> (`api/_lib/supabase.ts` → `adminClient`) **sigue necesitando**
> `@supabase/supabase-js` para acceder a la base de datos. Por eso **NO se
> desinstala el paquete**; solo se elimina el uso del cliente anon en `src/`.

- [ ] **Step 1: Confirmar que no quedan usos del cliente anon en `src/`**

Run (desde `frontend/`): `rg "lib/supabase|@supabase/supabase-js" src/`
Expected: sin resultados (exit code 1). Si aparece alguno (debería haberse migrado
en Tasks 6–7), eliminar ese uso antes de continuar.

- [ ] **Step 2: Eliminar el cliente anon del frontend**

Run (desde `frontend/`): `git rm src/lib/supabase.ts`

(El paquete `@supabase/supabase-js` permanece en `dependencies` porque lo usa el
backend.)

- [ ] **Step 3: Verificar que el backend sigue resolviendo Supabase y que el build pasa**

Run (desde `frontend/`): `rg "@supabase/supabase-js" api/_lib/supabase.ts`
Expected: 1 resultado (el backend lo sigue importando).

Run (desde `frontend/`): `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): remove Supabase Auth client from frontend"
```

---

### Task 10: Config, docs y checklist de ops

**Files:**
- Modify: `.env.example`
- Modify: `ARCHITECTURE.md`
- Create: `docs/auth0-resend-setup.md`

- [ ] **Step 1: Actualizar `.env.example`**

Leer `.env.example` y agregar (sin borrar las claves de Supabase que el backend
sigue usando):

```
# ── Auth0 (frontend SPA) ──
VITE_AUTH0_DOMAIN=tu-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=xxxxxxxx
VITE_AUTH0_AUDIENCE=https://api.hsp70

# ── Auth0 (API / verificación de token) ──
AUTH0_DOMAIN=tu-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.hsp70
```

- [ ] **Step 2: Actualizar `ARCHITECTURE.md` §8 (Auth)**

En `ARCHITECTURE.md`, en la sección "## 8. Modelo de Auth", reemplazar el bloque
"Actual (Supabase Auth)" para reflejar que el actual ya es Auth0:

```markdown
### Actual (Auth0)
- Frontend: `@auth0/auth0-react`, Universal Login (redirect + PKCE). El token de
  acceso (JWT) se obtiene con `getAccessTokenSilently` y viaja como `Bearer`.
- API: valida el JWT contra el JWKS de Auth0 (`api/_lib/auth0.ts`, librería
  `jose`), verificando issuer y audience. Luego mapea el `sub` a la fila
  `usuarios` por `auth0_sub` para obtener `rol` + `activo` (`api/_lib/auth.ts`).
- Provisioning lazy: en el primer login, si no hay fila para el `sub`, se relinkea
  por email una fila existente (preservando su rol) o se crea un `alumno`.
- Identidad: `usuarios.auth0_sub` ↔ `sub` de Auth0; `usuarios.id` es UUID interno.
- Emails de auth (verificación, reset, magic link) salen por Resend (SMTP custom).
```

Actualizar también la fila de la tabla de Stack (§3) si dice "Supabase Auth" como
actual → "Auth0". Actualizar la decisión **D2** para marcarla como implementada.

- [ ] **Step 3: Crear el checklist de ops Auth0 + Resend**

Crear `docs/auth0-resend-setup.md`:

```markdown
# Setup Auth0 + Resend (ops)

## Auth0
1. Crear un tenant en Auth0.
2. Crear una **Application** tipo "Single Page Application". Anotar `Domain` y
   `Client ID` → `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`.
3. En la app SPA, configurar:
   - Allowed Callback URLs: `http://localhost:5173`, `https://<tu-dominio-vercel>`
   - Allowed Logout URLs: idem
   - Allowed Web Origins: idem
4. Crear una **API** en Auth0. Identifier (audience): `https://api.hsp70` →
   `VITE_AUTH0_AUDIENCE`, `AUTH0_AUDIENCE`. `AUTH0_DOMAIN` = el domain del tenant.
5. Habilitar conexiones: Database (email+password) y Google (social).
   (MFA y passwordless son toggles opcionales que se activan acá sin tocar código.)
6. Cargar las variables en Vercel (frontend y funciones).

## Resend como SMTP de Auth0
1. En Resend: agregar y **verificar el dominio** de envío (DNS: SPF + DKIM).
2. Crear una API key en Resend.
3. En Auth0 → Branding → Email Provider → **Use my own email provider** → SMTP:
   - Host: `smtp.resend.com`  ·  Port: `465`  ·  Username: `resend`
   - Password: la API key de Resend
   - From: una dirección del dominio verificado
4. Enviar el email de prueba desde Auth0 y confirmar que llega.

## Bootstrap de la cuenta admin
- El relink por email es automático: si ya existe una fila `usuarios` con tu email
  y rol `admin` (del seed), el primer login por Auth0 le asigna `auth0_sub` y
  preserva el rol. No hace falta SQL manual.
- Fallback (si tu email en Auth0 difiere del de la fila, o no existe): tras el
  primer login, ejecutar en Supabase:
  ```sql
  UPDATE usuarios SET rol = 'admin' WHERE email = '<tu-email-en-auth0>';
  ```
```

- [ ] **Step 4: Verificar referencias**

Run: `rg -c "Auth0|Resend" docs/auth0-resend-setup.md`
Expected: ≥ 2.

Run: `rg "Auth0" ARCHITECTURE.md`
Expected: ≥ 1 (sección §8 actualizada).

- [ ] **Step 5: Commit**

```bash
git add .env.example ARCHITECTURE.md docs/auth0-resend-setup.md
git commit -m "docs(auth): document Auth0/Resend setup and update ARCHITECTURE"
```

---

## Manual Test Checklist (post-implementación, requiere tenant Auth0 real)

- [ ] Login email+password redirige a Universal Login y vuelve autenticado.
- [ ] "Continuar con Google" funciona.
- [ ] Primer login crea/relinkea la fila `usuarios` (verificar en Supabase).
- [ ] Tu cuenta queda con rol `admin` y ves el panel admin.
- [ ] Un usuario nuevo cae como `alumno` y ve el panel alumno.
- [ ] Cambiar el rol de un usuario desde el panel admin funciona.
- [ ] Logout limpia la sesión y redirige al inicio.
- [ ] Email de verificación/reset llega vía Resend.
- [ ] Una llamada a la API con token inválido devuelve 401; con rol insuficiente, 403.

---

## Self-Review (cobertura del spec)

- Spec §5 (migración esquema) → Task 1. ✅
- Spec §6 (verificación JWKS + lazy provisioning) → Tasks 3 (auth0.ts) y 4 (auth.ts). ✅
- Spec §7 (frontend SDK, AuthContext, Login/Register, onboarding) → Tasks 7 y 8. ✅
- Spec §8 (Resend SMTP) → Task 10 (checklist ops). ✅
- Spec §9 (env vars + cuenta admin) → Tasks 7, 10. ✅
- Spec §10 (limpieza: register, supabase frontend) → Tasks 5 y 9. ✅
- Spec §11 (testing) → Tasks 3, 4 (API, TDD) + checklist manual (frontend, por falta de infra). ✅
- Spec §4 (métodos login) → Task 10 (config Auth0); la app es agnóstica. ✅
- Token central de servicios (`services/api.ts`) → Task 6. ✅
```
