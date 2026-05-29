# Landing Page con Parallax — Design Spec

> **Project:** HSP-70 Gestión
> **Date:** 2026-05-29
> **Branch base:** `production`
> **Branch destino:** `feat/landing-parallax-amp`

## Goal

Re-implementar la landing page combinando tres mejoras en un solo cambio sobre `production`:

1. **Sistema visual amp** (light minimalismo, Montserrat 300, paleta naranja HSP-70, botones pill, info cards)
2. **Parallax scroll-down en todas las secciones** (imágenes de fondo que se mueven a velocidad distinta al scroll, creando profundidad)
3. **Imágenes deportivas reales** — fotos del equipo HSP-70 en `/public/images/equipo/` + stock de Unsplash temporal para deportes de acción (reemplazables a futuro)

## Why opción 2 (re-implementación) en lugar de cherry-pick

El branch `feat/landing-redesign-amp` tiene 8 commits de rediseño amp, pero el branch `production` divergió con la migración Supabase (M1-M11), incluyendo cambios en `supabase.ts` y `AuthContext.tsx` que crearían conflictos. Más importante: el rediseño amp original **no tenía parallax**. Como el usuario quiere parallax + imágenes en todas las secciones, los componentes amp se reescriben de todas formas. Re-implementar en un solo commit es más limpio que cherry-pick + nueva tarea encima.

## Architecture

### Estructura de archivos (todos existen ya)

```
frontend/
├── src/
│   ├── index.css                                # Tokens amp + Montserrat
│   ├── pages/Landing.tsx                        # Composición (wrapper)
│   └── components/landing/
│       ├── data.ts                              # Datos estáticos (ya existe)
│       ├── LandingNav.tsx                       # Nav con tema dual (dark/light)
│       ├── LandingHero.tsx                      # Hero 3-col parallax
│       ├── LandingActividadesStrip.tsx          # NUEVO — tira 5 cards parallax
│       ├── LandingActividades.tsx               # Lista detallada con bg parallax
│       ├── LandingComoFunciona.tsx              # Section naranja con bg parallax
│       ├── LandingPlanes.tsx                    # Cards de créditos (sin parallax)
│       ├── LandingEquipo.tsx                    # Dark section con bg parallax HSP-70
│       ├── LandingContacto.tsx                  # Light section con bg parallax
│       └── LandingFooter.tsx                    # True Black footer
│   └── hooks/
│       └── useParallax.ts                       # NUEVO — hook compartido del motor parallax
└── public/
    └── images/
        ├── equipo/                              # Ya existe — fotos reales del equipo
        └── stock/                               # NUEVO — copias locales de Unsplash (placeholder hasta tener fotos propias)
```

### Decisiones de diseño clave

**1. Motor de parallax compartido en `useParallax.ts`**

Un solo hook que registra todos los elementos `.pimg` (parallax image) y mantiene un `requestAnimationFrame` loop activo. Cada imagen tiene un `data-speed` (factor 0.10 a 0.30). La fórmula es:

```
offset = (containerCenterY - viewportCenterY) * speed
```

Esto desacopla el cálculo del scrollY absoluto. Cuando el contenedor está centrado en el viewport, offset = 0. Al scrollear se desplaza en proporción inversa a la velocidad — genera el efecto de profundidad.

**2. Imágenes "high travel"**

Cada imagen parallax está posicionada `position: absolute; top: -35%; left: 0; right: 0; height: 170%;`. Esto le da ±35% de margen para moverse sin exponer bordes blancos al scrollear. Con speed máximo 0.30 y secciones de hasta 1.5 viewport, el offset máximo queda ~30% del alto del contenedor — siempre dentro del buffer.

**3. Nav con tema dual**

El nav debe ser legible sobre fondos oscuros (hero, equipo, footer) y claros (actividades, contacto, planes). En cada frame del rAF loop, el motor detecta qué sección está bajo el punto Y=32 (centro vertical del nav) y aplica una de cuatro clases:
- `dark` — fondo transparente, links blancos
- `dark sc` — fondo `rgba(20,20,20,0.9)` con blur, links blancos
- `light` — fondo transparente, links muted
- `light sc` — fondo `rgba(255,255,255,0.95)` con blur, links muted

**4. Imágenes: dos estrategias**

- **Equipo (fotos reales HSP-70):** servidas desde `/images/equipo/*.jpg`. La foto grupal (`equipo-grupo-1.png`) va como fondo parallax con `brightness(0.12)`. Las individuales en cards.
- **Hero / Actividades / Cómo funciona / Contacto:** placeholders de Unsplash hasta que HSP-70 provea fotos propias. Para evitar dependencia online, se descargan a `frontend/public/images/stock/` durante la implementación. Set inicial: 8 imágenes (~150KB cada una a 1200px de ancho, ~1.2MB total).

**5. Reveal on scroll**

Cada sección tiene clase `reveal`. Un `IntersectionObserver` les agrega `.in` cuando entran al viewport, disparando `opacity` y `translateY` con transición de 500ms.

**6. Reduced motion**

Ya hay `@media (prefers-reduced-motion: reduce)` en `index.css` que desactiva animations. El hook `useParallax` debe respetar `matchMedia('(prefers-reduced-motion: reduce)').matches` y no aplicar transforms cuando esté activo.

## Component Specs

### useParallax hook

```typescript
// frontend/src/hooks/useParallax.ts
export function useParallax(): void {
  // - Monta listener al window scroll vía rAF loop
  // - En cada tick: recorre document.querySelectorAll('.pimg')
  // - Para cada uno: calcula offset basado en data-speed y centro del contenedor más cercano
  // - Aplica img.style.transform = `translateY(${offset}px)`
  // - Cleanup al desmontar
  // - Respeta prefers-reduced-motion
}
```

Se llama una vez en `<Landing>`. Como los `.pimg` se renderean dentro de Landing, no hay race conditions.

### Tokens CSS (en `index.css`)

Mantener los tokens existentes (`--color-neutral-*`, `--color-primary-*`, Barlow) intactos — los usa el resto de la app. **Agregar** los tokens amp dentro del mismo bloque `@theme`:

```css
--color-orange-ember: #f97316;  /* alias del primary-500 existente */
--color-soft-peach: #ffdfcd;
--color-ash-gray: #e5e5e5;
--color-deep-graphite: #0a0a0a;
--color-white-canvas: #ffffff;
--color-light-mist: #f3f4f3;
--color-dark-charcoal: #292b2a;
--color-true-black: #202120;
--color-muted-stone: #7a7b7b;
--color-light-border: #dfe0df;
--shadow-amp-cta: rgba(249,115,22,0.6) 1px 6px 14px 0px, rgba(0,0,0,0.06) 0px 1px 4px 0px;
--font-landing: 'Montserrat', ui-sans-serif, system-ui, sans-serif;
--radius-amp-btn: 24px;
--radius-amp-card: 5px;
--radius-amp-img: 8px;
```

Y agregar Montserrat al import de Google Fonts.

### Override del CSS global para landing

El `index.css` actual aplica `text-transform: uppercase` y `font-family: var(--font-display)` (Barlow Condensed) a `h1,h2,h3,h4,h5,h6` globalmente. Esto rompe el estilo amp de la landing. Solución: los componentes landing escriben los headings con inline `style={{ fontFamily: "var(--font-landing)", textTransform: "none" }}` para override puntual.

**No tocar las reglas globales** — el resto de la app (Dashboard, Login, etc.) usa Barlow uppercase y debe seguir funcionando igual.

### Mapeo de imágenes por sección

| Sección | Bg parallax | Speed | Filter |
|---|---|---|---|
| Hero (3 columnas) | 3 fotos gym Unsplash | 0.15 / 0.20 / 0.25 | brightness 0.35 |
| Strip actividades (5 cards) | 5 fotos gym Unsplash | 0.17 a 0.22 | brightness 0.35, hover 0.55 |
| Actividades (lista) | 1 foto gym ambiental | 0.12 | brightness 0.07, overlay ash-gray 93% |
| Cómo funciona | 1 foto entrenamiento | 0.13 | brightness 0.12, overlay naranja 90% |
| Equipo | `equipo-grupo-1.png` (real HSP-70) | 0.10 | brightness 0.12, overlay negro 70% |
| Planes | sin parallax (sección limpia) | — | — |
| Contacto | 1 foto wellness | 0.11 | brightness 0.06, overlay light-mist 94% |

## Error Handling

- **Imágenes fallan al cargar:** cada `<img>` tiene `onError` que oculta el elemento. La sección sigue mostrándose con su overlay sólido como fondo de fallback.
- **`prefers-reduced-motion` activo:** parallax se desactiva (no aplica transforms), animaciones reveal se reducen a 0.01ms (ya configurado en index.css).
- **Supabase no inicializado en build de Vercel:** `lib/supabase.ts` no tiene guards. La landing es pública y NO usa supabase, pero AuthContext sí. Si las env vars faltan en Vercel, el sitio crashea antes de renderizar la landing. **Out of scope para este plan** — el usuario lo dejó intencionalmente, asume que las env vars de Supabase ya están configuradas en Vercel.

## Testing Strategy

**No hay tests automatizados** para componentes landing (es UI, frontend-only). La verificación es manual:

1. `npx tsc --noEmit` → 0 errores
2. `npm run dev` → landing carga, todas las secciones visibles
3. Scrollear de arriba a abajo → confirmar parallax visible en cada sección sin que las imágenes "se rompan" (no exponer bordes)
4. Resize browser de 1440→375px → layouts responden, no hay overflow horizontal
5. Probar con DevTools "Emulate CSS prefers-reduced-motion" → parallax desactivado

## Performance

- **5–8 imágenes** de ~150KB cada una = ~1.2MB total (placeholders Unsplash + 1 foto real grupo). Aceptable para landing pública.
- **rAF loop** corre indefinidamente pero solo escribe cuando `scrollY` cambia. Cuando el usuario está quieto, el costo es mínimo.
- **`will-change: transform`** en cada `.pimg` activa GPU compositing — el parallax corre a 60fps en hardware moderno.
- **Off-screen culling:** el hook saltea elementos que están a más de 1 viewport de distancia (no aplica transform si no es visible).

## Out of Scope

- Tests automatizados (no hay framework de tests UI configurado)
- Pre-carga / lazy loading de imágenes (Vite hace bundling estático, sirve todo eficiente)
- Animaciones de los elementos al hacer hover (más allá del filtro brightness ya definido)
- Fotos profesionales propias de HSP-70 (placeholders por ahora, reemplazar tokens en `data.ts` o config cuando estén)
- Internationalización (todo en español)
- Sustitución del fondo del Hero por video (queda placeholder, ver TODO en código)

## Migration Path

1. Branch nuevo `feat/landing-parallax-amp` desde `production` actual.
2. Implementar componente por componente (plan separado lo detalla).
3. Crear PR → `production` directamente (el flow `staging` está obsoleto según el patrón M1-M11 que va directo a production).
4. Tras merge: el branch viejo `feat/landing-redesign-amp` queda para borrar (cerrar PR #10 sin mergear).

## Acceptance Criteria

- [ ] La landing en `localhost:5173` muestra el estilo amp (Montserrat, fondos claros y oscuros alternados, botones pill con sombra naranja, info cards blancos)
- [ ] Al scrollear hacia abajo, las imágenes de fondo de cada sección se mueven a velocidad distinta que el contenido (parallax visible)
- [ ] Las imágenes NO se rompen al scrollear (no se ven bordes blancos por arriba o abajo del contenedor)
- [ ] El nav cambia entre tema oscuro/claro según la sección que esté detrás
- [ ] Las fotos del equipo HSP-70 reales se muestran en LandingEquipo (no placeholders)
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `prefers-reduced-motion: reduce` desactiva el parallax
- [ ] Mobile (375px) muestra la landing sin overflow horizontal, parallax simplificado o desactivado

## References

- Mockup interactivo validado: `.superpowers/brainstorm/3422-1780081190/content/parallax-all-sections.html`
- Style reference: `DESIGN.md` (sistema amp)
- Datos estáticos del equipo y actividades: `frontend/src/components/landing/data.ts`
