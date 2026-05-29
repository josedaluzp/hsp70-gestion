# Setup Auth0 + Resend (ops)

## Auth0
1. Crear un tenant en Auth0.
2. Crear una **Application** tipo "Single Page Application". Anotar `Domain` y
   `Client ID` → `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`.
3. En la app SPA, configurar:
   - Allowed Callback URLs: `http://localhost:5173/dashboard`, `https://<tu-dominio-vercel>/dashboard`
     (el `redirect_uri` apunta a `/dashboard`)
   - Allowed Logout URLs: el origin (`http://localhost:5173`, `https://<tu-dominio-vercel>`)
   - Allowed Web Origins: el origin (idem que Logout)
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
