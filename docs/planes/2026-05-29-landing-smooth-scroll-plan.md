# Landing — Smooth Scroll + Pinned Section (Fase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el motor parallax casero con GSAP ScrollTrigger + integrar Lenis smooth scroll + convertir LandingComoFunciona en una sección pinneada con narrativa de 3 pasos.

**Architecture:** Mantenemos la API de `useParallax()` (mismo selector `.pimg` con `data-speed`, mismo `#landing-nav`) pero el motor interno pasa a usar GSAP + ScrollTrigger. Se crea hook nuevo `useLenis` para smooth scroll global, que se sincroniza con ScrollTrigger via `scrollerProxy`. Solo `LandingComoFunciona` se rediseña: pasa de layout estático a una sección pinneada de 300vh donde los 3 pasos se revelan progresivamente con el scroll.

**Tech Stack:** React 19, TypeScript, Vite, GSAP 3.12+, @gsap/react, Lenis 1.1+

**Design Reference:** `docs/planes/2026-05-29-landing-smooth-scroll-design.md`

---

## File Map

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modify | `frontend/package.json` | Agregar deps: `lenis`, `gsap`, `@gsap/react` |
| Create | `frontend/src/hooks/useLenis.ts` | Inicializa Lenis singleton + sincroniza con GSAP ticker |
| Replace | `frontend/src/hooks/useParallax.ts` | Reescribir con GSAP ScrollTrigger. Misma API (`useParallax(): void`). Sigue manejando `.pimg`+`data-speed` y `#landing-nav` |
| Modify | `frontend/src/pages/Landing.tsx` | Llamar `useLenis()` además de `useParallax()` |
| Replace | `frontend/src/components/landing/LandingComoFunciona.tsx` | Pinned section de 300vh con narrativa GSAP timeline |

---

## Task 1: Verificar punto de partida + crear branch

**Files:** ninguno modificado

- [ ] **Step 1.1: Verificar que estamos en el branch correcto**

```bash
cd "C:\Users\PC\jose\hsp70-gestion"
git branch --show-current
```

Expected: `feat/landing-smooth-scroll-gsap` (creado al inicio de la sesión, basado en `origin/production` post-merge de PR #11).

- [ ] **Step 1.2: Verificar working tree limpio**

```bash
git status
```

Expected: solo archivos untracked esperados (`.superpowers/`, `node_modules/`, `design-system/`, etc.). El spec `docs/planes/2026-05-29-landing-smooth-scroll-design.md` ya está committeado en `c9be51a`.

- [ ] **Step 1.3: Confirmar componentes amp ya están en su lugar**

```bash
ls frontend/src/hooks/useParallax.ts frontend/src/components/landing/LandingComoFunciona.tsx
```

Expected: ambos archivos existen (vinieron del PR #11 mergeado).

---

## Task 2: Instalar dependencias

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 2.1: Instalar Lenis, GSAP y @gsap/react**

```bash
cd frontend && npm install lenis@^1.1.13 gsap@^3.12.5 @gsap/react@^2.1.1
```

Expected: 3 packages añadidos a `dependencies` en `package.json`, `package-lock.json` actualizado, no peer dep warnings.

- [ ] **Step 2.2: Verificar instalación**

```bash
cd frontend && node -e "console.log(require('gsap/package.json').version, require('lenis/package.json').version, require('@gsap/react/package.json').version)"
```

Expected: versión de gsap ≥ 3.12.5, lenis ≥ 1.1.13, @gsap/react ≥ 2.1.1.

- [ ] **Step 2.3: Confirmar que la app sigue compilando**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 2.4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat(landing): add lenis, gsap, @gsap/react dependencies"
```

---

## Task 3: Crear hook useLenis

**Files:**
- Create: `frontend/src/hooks/useLenis.ts`

- [ ] **Step 3.1: Verificar que el dir existe**

```bash
ls frontend/src/hooks/
```

Expected: contiene `useAuth.ts`, `useParallax.ts`.

- [ ] **Step 3.2: Crear el archivo con este contenido exacto**

Crear `frontend/src/hooks/useLenis.ts`:

```typescript
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scroll global con Lenis, sincronizado con GSAP ScrollTrigger.
 *
 * - Inicia un singleton Lenis al mount, lo destruye al unmount.
 * - Usa el ticker de GSAP para correr el rAF loop de Lenis (un solo loop para todo).
 * - Llama ScrollTrigger.update() en cada scroll para mantener triggers sincronizados.
 * - Si prefers-reduced-motion está activo, Lenis se inicia sin inercia (wheelMultiplier 0,
 *   smoothWheel false) — la página scrollea como nativo.
 *
 * Debe llamarse UNA SOLA VEZ desde <Landing>. Si se monta más de uno, los Lenis se pisan.
 */
export function useLenis(): void {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reducedMotion,
      wheelMultiplier: reducedMotion ? 0 : 1,
      touchMultiplier: 1.5,
    });

    // Sync Lenis con ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Usar el ticker de GSAP para correr Lenis (1 rAF loop total)
    function raf(time: number) {
      lenis.raf(time * 1000);
    }
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
}
```

- [ ] **Step 3.3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3.4: Commit**

```bash
git add frontend/src/hooks/useLenis.ts
git commit -m "feat(landing): add useLenis hook with GSAP ticker integration"
```

---

## Task 4: Reescribir useParallax con GSAP ScrollTrigger

**Files:**
- Replace: `frontend/src/hooks/useParallax.ts`

- [ ] **Step 4.1: Leer el archivo actual primero (Write tool requiere Read previo)**

```bash
cat frontend/src/hooks/useParallax.ts
```

Verifica que es el motor casero con `requestAnimationFrame`.

- [ ] **Step 4.2: Reemplazar el contenido completo**

Reemplazar `frontend/src/hooks/useParallax.ts` con:

```typescript
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Parallax engine using GSAP ScrollTrigger.
 *
 * Pública: misma API que la versión anterior (rAF custom).
 * - Para cada `.pimg` con `data-speed`, crea un ScrollTrigger que aplica translateY
 *   proporcional al scroll del contenedor (centro a centro).
 * - Para `#landing-nav`, crea triggers por sección que aplican clases `dark|light` + `sc`.
 * - Respeta `prefers-reduced-motion` via gsap.matchMedia.
 *
 * Llamar UNA SOLA VEZ desde <Landing>. ScrollTrigger.refresh() se ejecuta al mount
 * para registrar las posiciones iniciales.
 */
export function useParallax(): void {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const triggers: ScrollTrigger[] = [];

      // 1) Parallax de imágenes .pimg
      const imgs = document.querySelectorAll<HTMLElement>(".pimg");
      imgs.forEach((img) => {
        const container =
          img.closest<HTMLElement>(".pcol") ||
          img.closest<HTMLElement>(".acard") ||
          img.closest<HTMLElement>(".p-section") ||
          (img.parentElement as HTMLElement);
        if (!container) return;

        const speed = parseFloat(img.dataset.speed ?? "0.15");
        // El offset máximo se da cuando el centro del contenedor está a una distancia
        // vh del centro del viewport. Eso da offset = vh * speed.
        // GSAP usa `yPercent` o `y`. Usamos `y` en px y dejamos que ScrollTrigger
        // interpole linealmente a partir del rect del contenedor.
        const vh = window.innerHeight;
        const maxOffset = vh * speed;

        const trig = ScrollTrigger.create({
          trigger: container,
          start: "top bottom",  // empieza cuando el top del contenedor toca el bottom del viewport
          end: "bottom top",    // termina cuando el bottom del contenedor toca el top del viewport
          scrub: true,
          onUpdate: (self) => {
            // self.progress va de 0 a 1 durante el trayecto.
            // En el centro (progress 0.5), offset = 0.
            // Antes del centro: offset positivo (imagen hacia abajo).
            // Después: offset negativo (imagen hacia arriba).
            const offset = (0.5 - self.progress) * 2 * maxOffset;
            img.style.transform = `translateY(${offset}px)`;
          },
        });
        triggers.push(trig);
      });

      // 2) Nav theme detection por sección
      const DARK_SECTIONS = ["hero", "strip", "como", "equipo"];
      const LIGHT_SECTIONS = ["actividades", "planes", "contacto"];
      const ALL_SECTIONS = [...DARK_SECTIONS, ...LIGHT_SECTIONS];

      const nav = document.getElementById("landing-nav");

      function setNavTheme(isDark: boolean, scrolled: boolean) {
        if (!nav) return;
        nav.className = (isDark ? "dark" : "light") + (scrolled ? " sc" : "");
      }

      ALL_SECTIONS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const isDark = DARK_SECTIONS.includes(id);
        const trig = ScrollTrigger.create({
          trigger: el,
          start: "top 64px",       // top del section toca y=64 (debajo del nav)
          end: "bottom 64px",      // bottom del section toca y=64
          onEnter: () => setNavTheme(isDark, window.scrollY > 20),
          onEnterBack: () => setNavTheme(isDark, window.scrollY > 20),
        });
        triggers.push(trig);
      });

      // 3) Detector de scrolled (sc class) global
      const scrolledTrig = ScrollTrigger.create({
        start: 0,
        end: 99999,
        onUpdate: () => {
          if (!nav) return;
          const sy = window.scrollY;
          const isScrolled = sy > 20;
          const isDarkCurrently = nav.classList.contains("dark");
          setNavTheme(isDarkCurrently, isScrolled);
        },
      });
      triggers.push(scrolledTrig);

      // Refresh inicial — registra posiciones después del primer paint
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        triggers.forEach((t) => t.kill());
      };
    });

    return () => {
      mm.revert();
    };
  }, []);
}
```

- [ ] **Step 4.3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4.4: Commit**

```bash
git add frontend/src/hooks/useParallax.ts
git commit -m "refactor(landing): rewrite useParallax engine with GSAP ScrollTrigger"
```

---

## Task 5: Wire useLenis + useParallax en Landing.tsx

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 5.1: Leer el archivo actual**

```bash
cat frontend/src/pages/Landing.tsx
```

- [ ] **Step 5.2: Reemplazar el contenido completo**

Reemplazar `frontend/src/pages/Landing.tsx` con:

```tsx
import { useLenis } from "../hooks/useLenis";
import { useParallax } from "../hooks/useParallax";
import LandingNav from "../components/landing/LandingNav";
import LandingHero from "../components/landing/LandingHero";
import LandingActividadesStrip from "../components/landing/LandingActividadesStrip";
import LandingActividades from "../components/landing/LandingActividades";
import LandingComoFunciona from "../components/landing/LandingComoFunciona";
import LandingPlanes from "../components/landing/LandingPlanes";
import LandingEquipo from "../components/landing/LandingEquipo";
import LandingContacto from "../components/landing/LandingContacto";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  // Lenis primero — registra el ticker de GSAP y el rAF loop.
  // useParallax (GSAP ScrollTrigger) depende de que el ticker esté activo.
  useLenis();
  useParallax();

  return (
    <div
      style={{
        fontFamily: "var(--font-landing)",
        backgroundColor: "var(--color-true-black)",
        color: "var(--color-deep-graphite)",
      }}
    >
      <LandingNav />
      <LandingHero />
      <LandingActividadesStrip />
      <LandingActividades />
      <LandingComoFunciona />
      <LandingPlanes />
      <LandingEquipo />
      <LandingContacto />
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 5.3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5.4: Smoke test — arrancar dev server**

```bash
cd frontend && npm run dev -- --port 5400
```

(Dejar correr en background o en otra terminal. No commitear todavía — primero verificamos visualmente.)

- [ ] **Step 5.5: Verificación visual del scroll inercial**

Abrir `http://localhost:5400/` y scrollear con la rueda del mouse. **Debe sentirse con inercia/easing** — al soltar la rueda, la página sigue desplazándose un beat antes de detenerse.

Si el scroll se siente nativo (cortado al instante), Lenis no está activo. Causas posibles:
- `prefers-reduced-motion` activo en el sistema (chequear DevTools → Rendering)
- Error de console en `useLenis` (revisar DevTools console)

Si pasa el smoke test, continuar al commit. Si no, BLOCKED — reportar el error.

- [ ] **Step 5.6: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): wire useLenis and refactored useParallax in Landing"
```

---

## Task 6: Convertir LandingComoFunciona en pinned section

**Files:**
- Replace: `frontend/src/components/landing/LandingComoFunciona.tsx`

- [ ] **Step 6.1: Leer el archivo actual**

```bash
cat frontend/src/components/landing/LandingComoFunciona.tsx
```

- [ ] **Step 6.2: Reemplazar el contenido completo**

Reemplazar `frontend/src/components/landing/LandingComoFunciona.tsx` con:

```tsx
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PASOS, SECTION_BG } from "./data";

gsap.registerPlugin(ScrollTrigger);

export default function LandingComoFunciona() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const pasoRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const section = sectionRef.current;
      const pin = pinRef.current;
      const pasos = pasoRefs.current.filter((el): el is HTMLDivElement => el !== null);
      if (!section || !pin || pasos.length === 0) return;

      // Estado inicial: paso 0 visible, otros ocultos (transformados)
      pasos.forEach((el, i) => {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, y: i === 0 ? 0 : 30 });
      });

      // Timeline encadenado: revela paso por paso a medida que se scrollea
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",         // pinea cuando el top del section toca el top del viewport
          end: "+=2000",            // duración del scroll virtual mientras está pinneado (2000px)
          pin: pin,                 // el div interno queda fijo
          scrub: 1,                 // scroll-driven con 1s de lag suave
          anticipatePin: 1,
        },
      });

      // Segmentos: cada paso ocupa 1/(N-1) del progreso total
      // N=3 → segmento 1: 0→0.5, segmento 2: 0.5→1.0
      // Paso 0 fade out + Paso 1 fade in, luego Paso 1 fade out + Paso 2 fade in
      for (let i = 0; i < pasos.length - 1; i++) {
        tl.to(pasos[i], { opacity: 0.3, y: -10, duration: 1 }, i);
        tl.to(pasos[i + 1], { opacity: 1, y: 0, duration: 1 }, i);
      }

      return () => {
        tl.kill();
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="como"
      className="p-section"
      style={{ position: "relative", overflow: "hidden", height: "300vh" }}
    >
      <div
        ref={pinRef}
        style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          className="pimg"
          data-speed={SECTION_BG.como.speed}
          src={SECTION_BG.como.src}
          alt=""
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          style={{
            position: "absolute",
            top: "-35%",
            left: 0,
            right: 0,
            height: "170%",
            objectFit: "cover",
            willChange: "transform",
            pointerEvents: "none",
            zIndex: 0,
            filter: "brightness(0.12) saturate(0.2)",
          }}
        />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(249,115,22,0.9)" }} />

        <div style={{ position: "relative", zIndex: 2, padding: "40px 48px", width: "100%" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
                marginBottom: "12px",
                fontFamily: "var(--font-landing)",
              }}
            >
              El sistema
            </p>
            <h2
              style={{
                fontFamily: "var(--font-landing)",
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "#fff",
                marginBottom: "64px",
                textTransform: "none",
              }}
            >
              Cómo funciona
            </h2>

            {/* Capa de pasos — apilados en la misma posición, GSAP cambia opacity/y */}
            <div style={{ position: "relative", minHeight: "180px" }}>
              {PASOS.map((paso, i) => (
                <div
                  key={paso.n}
                  ref={(el) => {
                    pasoRefs.current[i] = el;
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "24px",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "var(--radius-amp-btn)",
                      flexShrink: 0,
                      background: "rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "#fff",
                      fontFamily: "var(--font-landing)",
                    }}
                  >
                    {paso.n}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 600,
                        color: "#fff",
                        fontFamily: "var(--font-landing)",
                        lineHeight: 1.2,
                      }}
                    >
                      {paso.titulo}
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        color: "rgba(255,255,255,0.78)",
                        marginTop: "8px",
                        lineHeight: 1.55,
                        maxWidth: "520px",
                      }}
                    >
                      {paso.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progreso visual: 3 puntos que se "llenan" según el paso activo */}
            <div style={{ display: "flex", gap: "8px", marginTop: "80px" }}>
              {PASOS.map((p, i) => (
                <div
                  key={p.n}
                  style={{
                    width: "32px",
                    height: "3px",
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: "2px",
                  }}
                  data-paso-dot={i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6.3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 6.4: Smoke test visual**

Si el dev server quedó corriendo en `localhost:5400`, refrescar la página. Si no, arrancarlo de nuevo (`cd frontend && npm run dev -- --port 5400`).

Scrollear hasta "Cómo funciona":
- La sección debe **pinearse** (quedar fija en pantalla) cuando llega al top
- Al seguir scrolleando, los 3 pasos deben **revelarse uno por uno**: el primero se atenúa cuando aparece el segundo, etc.
- Después de revelar el tercer paso, la sección **libera** y el scroll continúa al resto

Si la sección no se pinea (sigue scrolleando lineal), causas posibles:
- ScrollTrigger no se inicializó (revisar console por error de import)
- El altura de 300vh no está aplicada (inspeccionar `#como` en DevTools)
- `gsap.matchMedia` no encontró match (probablemente `prefers-reduced-motion: reduce` activo)

Si el smoke test pasa, continuar al commit.

- [ ] **Step 6.5: Commit**

```bash
git add frontend/src/components/landing/LandingComoFunciona.tsx
git commit -m "feat(landing): LandingComoFunciona as pinned section with GSAP timeline"
```

---

## Task 7: Verificación local completa

**Files:** ninguno modificado

- [ ] **Step 7.1: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 7.2: Build de producción**

```bash
cd frontend && npm run build
```

Expected: build exitoso. Comparar gzipped size del bundle con el último build (~280KB). Tolerable hasta ~400KB con GSAP+Lenis incluidos.

- [ ] **Step 7.3: Dev server**

```bash
cd frontend && npm run dev -- --port 5400
```

(Si quedó del Task 6, no es necesario re-arrancarlo).

- [ ] **Step 7.4: Verificación visual checklist**

Abrir `http://localhost:5400/` en el browser y verificar:

| Check | Esperado |
|---|---|
| Scroll con rueda del mouse | Inercia perceptible (Lenis) — al soltar, la página sigue un beat |
| Hero parallax | 3 columnas con imágenes moviéndose a velocidad distinta al scroll |
| Strip cards parallax | 5 cards con imágenes moviéndose |
| Nav theme | Cambia entre dark/light al pasar por hero (dark) → actividades (light) → como (dark) → planes (light) → equipo (dark) → contacto (light) |
| Cómo funciona pinned | Se queda fija al llegar al top. Los 3 pasos se revelan al scrollear. Después libera |
| Resto del flow | Sigue normal hasta el footer |
| Footer | True Black, logo opaco |
| Nav links click | Smooth scroll a cada sección (Lenis maneja el scrollIntoView) |

- [ ] **Step 7.5: Verificación reduced-motion**

DevTools → 3 puntos → More tools → Rendering → Emulate CSS media feature `prefers-reduced-motion` → `reduce`.

Recargar página. Verificar:
- Scroll con rueda se siente NATIVO (sin inercia Lenis)
- Imágenes parallax NO se transforman al scrollear
- Sección "Cómo funciona" muestra los 3 pasos al mismo tiempo (sin pin, sin timeline)
- Resto de la app se ve igual

Después de verificar, desactivar la emulación.

- [ ] **Step 7.6: Verificación mobile (375px)**

DevTools → toggle device toolbar (Ctrl+Shift+M) → iPhone SE (375px).

Verificar:
- No hay overflow horizontal
- Burger menu funciona
- "Cómo funciona" pinned se ve OK en mobile (puede ser más ajustado, pero legible)

Si el pinned section se rompe en mobile, NO bloquear: anotar como deuda técnica para iterar después.

---

## Task 8: Esperar aprobación del usuario antes del push

**Files:** ninguno modificado

- [ ] **Step 8.1: Reportar resultados al usuario**

Mostrar:
- 6 commits creados en `feat/landing-smooth-scroll-gsap`
- TypeScript check: ✅
- Build: ✅ (bundle size: XYZ KB gzipped)
- Verificación visual: lista de los 8 checks del Task 7.4 con status
- Reduced-motion: ✅/❌
- Mobile 375px: ✅/⚠️ con notas

Preguntar literalmente: **"Verificado en local. ¿Hago push a `feat/landing-smooth-scroll-gsap` y abro PR a `production`?"**

NO continuar al Task 9 hasta tener respuesta afirmativa del usuario.

---

## Task 9: Push + PR a production (solo tras aprobación)

**Files:** ninguno modificado

- [ ] **Step 9.1: Push del branch**

```bash
git push -u origin feat/landing-smooth-scroll-gsap
```

Expected: branch publicado en origin.

- [ ] **Step 9.2: Crear PR contra production**

```bash
gh pr create \
  --base production \
  --title "feat(landing): smooth scroll (Lenis) + GSAP ScrollTrigger + pinned section" \
  --body "$(cat <<'EOF'
## Summary
- Smooth scroll global con Lenis (inercia/easing perceptible al scrollear).
- Motor parallax reemplazado: \`useParallax\` ahora usa GSAP ScrollTrigger en lugar de \`requestAnimationFrame\` casero.
- Sección \"Cómo funciona\" se vuelve pinneada: queda fija mientras se scrollea y los 3 pasos se revelan progresivamente.

## Files changed
- New: \`frontend/src/hooks/useLenis.ts\`
- Replaced: \`frontend/src/hooks/useParallax.ts\` (mismo API externo)
- Modified: \`frontend/src/pages/Landing.tsx\` (llama useLenis + useParallax)
- Replaced: \`frontend/src/components/landing/LandingComoFunciona.tsx\` (pinned section)
- Modified: \`frontend/package.json\` (+lenis, gsap, @gsap/react)

## Spec
\`docs/planes/2026-05-29-landing-smooth-scroll-design.md\`

## Verification
- \`npx tsc --noEmit\` ✅
- \`npm run build\` ✅
- Smooth scroll visible ✅
- Parallax sigue funcionando ✅
- Pinned section funciona ✅
- prefers-reduced-motion desactiva todo ✅
- Aprobación visual del usuario ✅

## Out of scope (Fase B)
- Video scrubbing con Remotion
- Cambios de color de fondo dramáticos por sección
EOF
)"
```

Expected: PR URL devuelto por `gh`.

- [ ] **Step 9.3: Reportar URL del PR al usuario**

---

## Notas de implementación

- **Si GSAP plugins no se importan correctamente:** la versión 3.12+ exporta `ScrollTrigger` desde `gsap/ScrollTrigger`. Si TS se queja por tipos, verificar que `@types/gsap` o tipos built-in están disponibles (GSAP 3.12+ trae tipos propios).
- **Si Lenis interfiere con anchor scroll:** los `<a href="#actividades">` del nav usan `document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })`. Lenis intercepta `scrollIntoView` automáticamente, así que debería funcionar. Si no, usar `lenis.scrollTo("#actividades")`.
- **Cleanup en SPA navigation:** los hooks `useLenis` y `useParallax` se montan en `<Landing>` y limpian en unmount. Si el usuario navega a `/login`, Lenis se destruye correctamente.
- **NO commitear si TSC falla en cualquier task.** Si encuentras un error de tipos imprevisto, reportar BLOCKED.
