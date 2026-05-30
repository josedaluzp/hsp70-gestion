# Landing — Smooth Scroll + Pinned Section (Fase A)

> **Project:** HSP-70 Gestión
> **Date:** 2026-05-29
> **Base:** `origin/production` (post-merge de PR #11)
> **Branch:** `feat/landing-smooth-scroll-gsap`
> **Inspiración:** [gentlerain.ai](https://www.gentlerain.ai/) — analizado en sesión anterior

## Goal

Incorporar dos mejoras concretas a la landing actual para acercarla al "feel" de gentlerain sin re-escribir todo:

1. **Smooth scroll global** con Lenis — el scroll de la página tiene inercia/easing, no es el step lineal del browser
2. **Reemplazar el motor parallax casero** (`useParallax` con rAF) por **GSAP + ScrollTrigger** — mismo efecto visual pero más robusto y permite triggers más complejos
3. **Sección "Cómo funciona" pinneada** — al llegar, la sección se queda fija en pantalla mientras el usuario scrollea, y los 3 pasos se revelan uno por uno con animaciones encadenadas. Solo después de revelar los 3 pasos, la página sigue avanzando

## Why this scope

Vos compartiste gentlerain.ai como referencia. Lo que da el "wow" ahí son tres cosas:

- **Lenis** (smooth scroll inercial) — barato de incorporar, alto impacto sensorial
- **ScrollTrigger pin** — secciones que se quedan fijas mientras el contenido interno avanza con el scroll. Es el efecto cinemático principal
- **Video scrubbing** — el más caro. Lo dejamos para Fase B con Remotion

Esta Fase A toma los dos primeros sin entrar al video. Es un cambio "motor + 1 sección estrella" sobre la landing que ya funciona.

## Architecture

### Dependencias nuevas

```json
{
  "dependencies": {
    "lenis": "^1.1.13",
    "gsap": "^3.12.5",
    "@gsap/react": "^2.1.1"
  }
}
```

**Tamaño bundle adicional:** ~75KB gzipped (Lenis ~6KB, GSAP core + ScrollTrigger ~70KB). Aceptable: la landing es la página de mayor peso visual del sitio y carga una vez.

### Files map

| Acción | Archivo | Cambio |
|---|---|---|
| Modificar | `frontend/package.json` | Agregar deps |
| Crear | `frontend/src/hooks/useLenis.ts` | Inicializa Lenis smooth scroll global |
| Reemplazar | `frontend/src/hooks/useParallax.ts` | Reescribir con GSAP ScrollTrigger en lugar de rAF custom. **Mantiene la misma API** (`useParallax(): void`) para no romper Landing.tsx |
| Modificar | `frontend/src/pages/Landing.tsx` | Llamar `useLenis()` además de `useParallax()` |
| Reemplazar | `frontend/src/components/landing/LandingComoFunciona.tsx` | Convertir en sección pinneada con narrativa scroll de 3 pasos |
| Sin cambios | Resto de los componentes landing | Siguen usando `.pimg` con `data-speed`, el motor nuevo los detecta igual |

### Decisión clave: API estable de `useParallax`

El hook actual `useParallax` se reemplaza internamente, pero **mantiene la misma signature y selectores** (`.pimg`, `data-speed`, `#landing-nav`). Esto significa:
- `LandingHero`, `LandingActividadesStrip`, `LandingActividades`, `LandingComoFunciona` (el bg image), `LandingEquipo`, `LandingContacto` siguen funcionando sin tocarlos
- Solo cambia `LandingComoFunciona` por razón aparte (volverse pinned)

### Cómo funciona la pinned section

**Layout actual:**
```
<section id="como" style="padding: 100px 48px">
  <p>El sistema</p>
  <h2>Cómo funciona</h2>
  <Paso 1 />  ← todos visibles al mismo tiempo
  <Paso 2 />
  <Paso 3 />
</section>
```

**Layout pinned nuevo:**
```
<section id="como" data-pinned style="height: 300vh">     ← contenedor alto (3 viewports)
  <div class="pin-target" style="position: sticky; top: 0; height: 100vh">
    ← este div se "pinea" al top mientras el scroll avanza dentro del contenedor
    <p>El sistema</p>
    <h2>Cómo funciona</h2>
    <Paso 1 />   ← visibles, controlados por progreso del ScrollTrigger
    <Paso 2 />
    <Paso 3 />
  </div>
</section>
```

GSAP timeline encadenado:
- 0% → 33%: paso 1 visible, pasos 2 y 3 ocultos (opacity 0, translateY 20px)
- 33% → 66%: paso 2 entra, paso 1 se va dim, paso 3 oculto
- 66% → 100%: paso 3 entra, pasos anteriores dim
- 100%+: el pin se libera, sigue el flow normal

Mientras el usuario scrollea esos ~2400px (= 3 viewports menos el inicial), el contenido se queda fijo en pantalla y los pasos avanzan en sincronía con el scroll.

### Cleanup del motor viejo

El hook actual `useParallax` tiene un `requestAnimationFrame` loop manual que detecta scroll y actualiza transforms. Con GSAP ScrollTrigger:
- ScrollTrigger.batch() reemplaza la detección de off-screen
- ScrollTrigger.create({trigger, scrub: true, onUpdate}) reemplaza la lógica de translateY por elemento
- ScrollTrigger.scrollerProxy() conecta Lenis con ScrollTrigger (necesario porque Lenis interfiere con el scroll nativo)

## Reduced Motion

GSAP tiene soporte built-in con `gsap.matchMedia()`:

```typescript
const mm = gsap.matchMedia();
mm.add("(prefers-reduced-motion: no-preference)", () => {
  // setup parallax + pin
});
// Cuando reduced-motion está activo, este bloque no se ejecuta → no hay animaciones
```

Lenis también respeta reduced-motion con `lenis = new Lenis({ wheelMultiplier: matches ? 0 : 1 })`.

## Testing Strategy

Mismo enfoque que Fase 1: verificación manual local.

1. `npx tsc --noEmit` → 0 errores
2. `npm run build` → bundle no más de 1.2MB gzipped (tope soft)
3. `npm run dev` → landing carga, scroll tiene inercia (Lenis), parallax visible
4. Llegar a "Cómo funciona" → la sección se pinea, los 3 pasos se revelan al scrollear más
5. Pasada la pinned section → el scroll continúa al resto de la página
6. DevTools `prefers-reduced-motion: reduce` → todo el efecto se desactiva (Lenis no aplica inercia, GSAP no anima)
7. Mobile 375px → pin se mantiene pero el motor parallax casero ya pasaba bien, solo verificar que el pinned no rompe layout

## Performance

- **Lenis** usa `requestAnimationFrame` también pero más optimizado y con willChange correcto
- **GSAP ScrollTrigger** corre todo en GPU cuando los transforms son `translate/scale/opacity` (todos los nuestros lo son)
- **Pin section** crea un `position: sticky` interno: el browser ya está optimizado para sticky, no es un hack JS
- Bundle: +75KB gzipped (Lenis + GSAP). El proyecto ya tiene 280KB gzipped según el último build, vamos a ~355KB. Sigue siendo razonable para una landing

## Out of Scope (Fase A)

- Video scrubbing (Remotion) — Fase B
- Cambios de color de fondo dramáticos por sección — Fase C
- Animaciones de entrada en los demás componentes (Hero, Equipo, Planes) — están bien como están
- Re-diseñar el contenido textual de los 3 pasos de Cómo funciona — el texto se mantiene, solo cambia cómo se revela
- Mobile: pin se mantiene en mobile pero si el efecto se ve mal en pantallas chicas, lo desactivamos con matchMedia

## Migration

1. Branch ya creado: `feat/landing-smooth-scroll-gsap` desde `origin/production`
2. Implementar siguiendo el plan
3. Verificación local + tu aprobación
4. PR a `production` (mismo flow que PR #11)

## Acceptance Criteria

- [ ] Scroll de la página tiene inercia/easing perceptible (Lenis)
- [ ] Parallax en hero, strip, actividades, equipo, contacto sigue funcionando (motor GSAP)
- [ ] Nav cambia entre tema oscuro/claro según sección (igual que antes)
- [ ] "Cómo funciona" se pinea al llegar, revela 3 pasos al scrollear, libera después
- [ ] `npx tsc --noEmit` pasa sin errores
- [ ] `prefers-reduced-motion: reduce` desactiva Lenis + GSAP
- [ ] Bundle gzipped ≤ 400KB (límite suave)

## Open Question

**¿Sirve confirmar visualmente la sección pinned antes del PR?** Sí — el flow de PR #11 fue: implementación → tu review local → push. Mantenemos ese gate.
