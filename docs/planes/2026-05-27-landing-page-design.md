# Landing Page HSP-70 — Diseño Aprobado

**Fecha:** 2026-05-27  
**Estado:** Aprobado — listo para implementar

---

## Contexto

El sistema de gestión HSP-70 no tiene landing page pública. Todo arranca en `/login`. Se requiere una landing en la ruta raíz `/` que comunique la identidad del centro, sus actividades y el modelo de créditos, y convierta visitantes en registrados.

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Estilo visual | Dark Inmersivo | Elegido por el usuario entre 4 opciones |
| Tipografía hero | Outline + fill naranja | Contraste fuerte, look atlético |
| Color primario | `#f97316` (orange-500) | Consistente con el sistema de gestión |
| Fondo | `#000` / `#0a0a0a` | Máximo contraste, inmersivo |
| Hero video | Higgsfield AI | Generado externamente, embed como `<video>` autoplay muted loop |
| Stack | React + TailwindCSS (existente) | Misma base que el proyecto |
| Mobile | Responsive mobile-first | Base para futura app React Native |

---

## Estructura de la página (orden de secciones)

### 1. Navbar (sticky)
- Logo `hsp-70-logo.png` (ya en `public/`)
- Links: Actividades · Equipo · Planes (smooth scroll)
- CTA "Ingresar" → `/login`
- Mobile: hamburger menu colapsable
- Fondo: `rgba(0,0,0,0.9)` con `backdrop-filter: blur`
- Borde inferior: `border-b border-neutral-900`

### 2. Hero
- Video de fondo Higgsfield (autoplay, muted, loop, object-cover)
- Overlay oscuro encima del video
- Grid sutil de líneas naranjas (CSS `repeating-linear-gradient`)
- Tipografía:
  - `SALUD` → texto outline naranja (color transparent, -webkit-text-stroke)
  - `&` → fill naranja
  - `CIENCIA` → blanco
  - Fuente: `font-black uppercase`, tamaño grande responsive
- Subtítulo: "Centro Fitness · Rendimiento Físico"
- 2 CTAs: `VER ACTIVIDADES ↓` (scroll) + `NUESTROS PLANES` (scroll)
- Indicador scroll animado

### 3. Stats (3 bloques)
- Grid 3 columnas, separadas por líneas `#111`
- Datos: `7 Actividades` · `8 Profesionales` · `N°1 En Chubut`
- Número en naranja grande, label en gris oscuro
- Sin fondo naranja (a diferencia del enfoque A)

### 4. Actividades
- Lista numerada `01`–`07` con las 7 actividades reales
- Cada fila: número naranja · nombre + descripción breve · chip con duración
- Hover: nombre se vuelve naranja
- Datos reales del seed: cupo máximo y duración por actividad
- Las 7 actividades: Pilates Reformer, Entren. Integral, Fitness Pediátrico, Cardiovascular, Active Recovery, Readaptación Deportiva, Nutrición Deportiva

### 5. Cómo funciona (fondo naranja `#f97316`)
- Sección naranja sólida — contraste máximo con el resto oscuro
- 3 pasos con círculos numerados negros:
  1. **Elegí tu actividad** — Pilates, Cardio, Nutrición y más
  2. **Comprá un pack de créditos** — Usalos como y cuando quieras
  3. **Reservá tu clase online** — Confirmación instantánea, cancelación hasta 2hs antes sin perder el crédito
- Conectores verticales entre pasos

### 6. Packs de créditos
- 3 cards: Básico (10 créditos) · Pro (25 créditos, destacado) · Elite (50 créditos)
- 1 crédito = 1 clase en cualquier actividad
- Sin vencimiento
- Card Pro con `border border-orange-500` y badge "MÁS ELEGIDO"
- CTA "EMPEZAR" → `/register`
- **Precios:** a confirmar con el centro (placeholders en la implementación)

### 7. El equipo
- Grid 4×2 con los 8 profesionales reales:
  - Yanina Figuerao — Directora
  - Ángel Da Luz Pereira — Director
  - Facundo Nieva — Prof. Ed. Física
  - Bruno Rubio — Prof. Ed. Física
  - Maximiliano Tögel — Lic. Ed. Física
  - Manuel Pazos Espín — Médico Deportólogo
  - Walter Ríos — Lic. Kinesiología
  - Gabriel Velázquez — Ortopedista
- **Fotos:** colocar en `frontend/public/images/equipo/` con nombres `yanina-figuerao.jpg`, etc.
- Borde inferior naranja en cada foto
- Fila inferior para fotos de atletas asociados (placeholders hasta tener imágenes reales)

### 8. Ubicación y Contacto
- Embed de Google Maps (San Martín 1085, Comodoro Rivadavia)
- Dirección y teléfono con íconos
- Botón WhatsApp verde directo a `https://wa.me/5492976257545`

### 9. Footer
- Logo HSP-70
- "Salud & Ciencia · Comodoro Rivadavia"
- Links: Instagram · Facebook · WhatsApp
- Copyright

---

## Routing

```tsx
// App.tsx — nueva ruta pública
<Route path="/" element={<LandingPage />} />
```

- La ruta `/` muestra la landing para todos (autenticados o no)
- Usuarios autenticados que visiten `/` ven la landing con el botón "Ingresar" que lleva a su dashboard
- El componente `LandingPage` lee el token del contexto de auth: si existe, el botón "Ingresar" apunta a `/<rol>/dashboard` en lugar de `/login`
- Las rutas protegidas siguen redirigiendo a `/login` si no hay sesión

---

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/pages/Landing.tsx` | Componente principal de la landing |
| `frontend/src/components/landing/Navbar.tsx` | Navbar con scroll-spy y hamburger |
| `frontend/src/components/landing/Hero.tsx` | Hero con video Higgsfield |
| `frontend/src/components/landing/Stats.tsx` | Bloque de 3 stats |
| `frontend/src/components/landing/Actividades.tsx` | Lista numerada de actividades |
| `frontend/src/components/landing/ComoFunciona.tsx` | Sección naranja 3 pasos |
| `frontend/src/components/landing/Planes.tsx` | Cards de packs de créditos |
| `frontend/src/components/landing/Equipo.tsx` | Grid del equipo + atletas |
| `frontend/src/components/landing/Contacto.tsx` | Mapa + WhatsApp |
| `frontend/src/components/landing/Footer.tsx` | Footer |
| `frontend/public/images/equipo/` | Fotos de profesionales (a proveer) |
| `frontend/public/images/hero-video.mp4` | Video Higgsfield (a proveer) |

---

## Assets pendientes (el usuario debe proveer)

- [ ] Video hero generado en Higgsfield → `frontend/public/images/hero-video.mp4`
- [ ] Fotos de los 8 profesionales → `frontend/public/images/equipo/<nombre>.jpg`
- [ ] Fotos de atletas asociados → `frontend/public/images/atletas/<nombre>.jpg`
- [ ] Precios reales de los packs de créditos

---

## Notas técnicas

- Mobile-first: breakpoints `sm:` / `md:` / `lg:` de Tailwind
- Componentes sin dependencia del DOM para futura portabilidad a React Native
- Smooth scroll con `scroll-behavior: smooth` en `html`
- Video Hero: `<video autoPlay muted loop playsInline className="object-cover w-full h-full">`
- Imágenes de equipo: `<img>` con fallback a avatar placeholder si no existe el archivo
