# Landing Page Parallax + Amp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-implementar la landing page con estilo amp + parallax scroll en todas las secciones + imágenes deportivas reales del equipo HSP-70, sobre el branch `production` actual.

**Architecture:** 9 componentes en `frontend/src/components/landing/` reescritos + 1 hook nuevo en `frontend/src/hooks/useParallax.ts` + tokens CSS amp en `index.css` (sin tocar tokens existentes). Las imágenes parallax (`.pimg`) son `position:absolute; top:-35%; height:170%` con `data-speed` attribute, movidas por un `requestAnimationFrame` loop centralizado.

**Tech Stack:** React 19, TypeScript, TailwindCSS v4, Vite, Montserrat (Google Fonts), Supabase ya configurado (no se toca)

**Design Reference:** `docs/planes/2026-05-29-landing-parallax-design.md` + `DESIGN.md`

---

## File Map

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modify | `frontend/src/index.css` | Agregar tokens amp + Montserrat (no tocar lo existente) |
| Create | `frontend/src/hooks/useParallax.ts` | Motor parallax compartido (rAF loop + nav theme detector) |
| Create | `frontend/public/images/stock/*.jpg` | 7 imágenes Unsplash descargadas localmente |
| Modify | `frontend/src/components/landing/data.ts` | Agregar arrays IMG_HERO, IMG_STRIP con paths locales |
| Modify | `frontend/src/pages/Landing.tsx` | Inicializa useParallax(), compone secciones |
| Modify | `frontend/src/components/landing/LandingNav.tsx` | Tema dual via clases dark/light/sc del hook |
| Modify | `frontend/src/components/landing/LandingHero.tsx` | 3 columnas parallax, headline Montserrat 300 |
| Create | `frontend/src/components/landing/LandingActividadesStrip.tsx` | Tira 5 cards con bg parallax |
| Modify | `frontend/src/components/landing/LandingActividades.tsx` | Lista con bg parallax + overlay claro |
| Modify | `frontend/src/components/landing/LandingComoFunciona.tsx` | Bg parallax + overlay naranja |
| Modify | `frontend/src/components/landing/LandingPlanes.tsx` | Sin parallax — sección limpia |
| Modify | `frontend/src/components/landing/LandingEquipo.tsx` | Bg parallax con foto grupo real + cards 8 miembros |
| Modify | `frontend/src/components/landing/LandingContacto.tsx` | Bg parallax + overlay light-mist |
| Modify | `frontend/src/components/landing/LandingFooter.tsx` | True Black, sin parallax |

---

## Task 1: Setup — branch nuevo + verificar punto de partida

**Files:** ninguno modificado todavía

- [ ] **Step 1.1: Verificar branch actual y working tree limpio**

```bash
cd "C:\Users\PC\jose\hsp70-gestion"
git status
```

Expected: en branch `production`, sin cambios sin trackear excepto el spec ya committeado en `38c04b0`.

- [ ] **Step 1.2: Crear branch nuevo desde production**

```bash
git checkout -b feat/landing-parallax-amp
```

Expected: `Switched to a new branch 'feat/landing-parallax-amp'`

- [ ] **Step 1.3: Crear directorio para stock images**

```bash
mkdir -p frontend/public/images/stock
```

Expected: directorio creado sin error.

---

## Task 2: Descargar imágenes stock (Unsplash)

**Files:**
- Create: `frontend/public/images/stock/hero-1.jpg` ... `hero-3.jpg`
- Create: `frontend/public/images/stock/strip-1.jpg` ... `strip-5.jpg`
- Create: `frontend/public/images/stock/section-actividades.jpg`
- Create: `frontend/public/images/stock/section-como.jpg`
- Create: `frontend/public/images/stock/section-contacto.jpg`

- [ ] **Step 2.1: Descargar las 10 imágenes con curl**

Ejecutar este script PowerShell desde la raíz del proyecto:

```powershell
$base = "frontend/public/images/stock"
$urls = @{
  "hero-1.jpg"             = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80&fm=jpg"
  "hero-2.jpg"             = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80&fm=jpg"
  "hero-3.jpg"             = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80&fm=jpg"
  "strip-1.jpg"            = "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=75&fm=jpg"
  "strip-2.jpg"            = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=75&fm=jpg"
  "strip-3.jpg"            = "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=800&q=75&fm=jpg"
  "strip-4.jpg"            = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=75&fm=jpg"
  "strip-5.jpg"            = "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=75&fm=jpg"
  "section-actividades.jpg"= "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1800&q=70&fm=jpg"
  "section-como.jpg"       = "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1800&q=70&fm=jpg"
  "section-contacto.jpg"   = "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1800&q=70&fm=jpg"
}
foreach ($name in $urls.Keys) {
  Invoke-WebRequest -Uri $urls[$name] -OutFile "$base/$name" -UseBasicParsing
  Write-Host "Downloaded $name"
}
```

Expected: 11 archivos descargados (cada uno entre 80-300KB).

- [ ] **Step 2.2: Verificar tamaño total**

```powershell
Get-ChildItem frontend/public/images/stock | Measure-Object -Property Length -Sum
```

Expected: Sum entre 1MB y 3MB.

- [ ] **Step 2.3: Commit**

```bash
git add frontend/public/images/stock/
git commit -m "feat(landing): add stock sports imagery for parallax sections"
```

---

## Task 3: Tokens CSS amp + Montserrat

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 3.1: Leer index.css para confirmar estructura actual**

```bash
head -5 frontend/src/index.css
```

Expected: línea 1 `@import "tailwindcss";`, línea 2 import de Google Fonts con Barlow.

- [ ] **Step 3.2: Reemplazar la línea de Google Fonts para incluir Montserrat**

En `frontend/src/index.css`, cambiar la línea 2:

```css
/* ANTES (línea 2) */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600;700&display=swap');

/* DESPUÉS */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap');
```

- [ ] **Step 3.3: Agregar tokens amp al final del bloque @theme**

Insertar antes del cierre `}` del bloque `@theme` (línea 82 aprox., justo después de `--transition-slow`):

```css
  /* ── Landing — Amp Design System ── */
  --color-orange-ember:  #f97316;
  --color-soft-peach:    #ffdfcd;
  --color-warm-glow:     #ffa069;
  --color-ash-gray:      #e5e5e5;
  --color-deep-graphite: #0a0a0a;
  --color-white-canvas:  #ffffff;
  --color-light-mist:    #f3f4f3;
  --color-dark-charcoal: #292b2a;
  --color-true-black:    #202120;
  --color-muted-stone:   #7a7b7b;
  --color-light-border:  #dfe0df;

  --shadow-amp-cta: rgba(249, 115, 22, 0.6) 1px 6px 14px 0px, rgba(0, 0, 0, 0.06) 0px 1px 4px 0px;

  --font-landing: 'Montserrat', ui-sans-serif, system-ui, sans-serif;

  --radius-amp-btn:  24px;
  --radius-amp-card: 5px;
  --radius-amp-img:  8px;
```

- [ ] **Step 3.4: Verificar que la app sigue compilando**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 3.5: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(landing): add amp design tokens and Montserrat to index.css"
```

---

## Task 4: useParallax hook (motor parallax + nav theme)

**Files:**
- Create: `frontend/src/hooks/useParallax.ts`

- [ ] **Step 4.1: Crear el hook**

Crear `frontend/src/hooks/useParallax.ts`:

```typescript
import { useEffect } from "react";

/**
 * Parallax engine for landing page.
 *
 * - Looks for `.pimg` elements (parallax images) and shifts them based on their
 *   parent container's distance from viewport center.
 * - Looks for `#landing-nav` and applies theme classes based on which section
 *   is under the nav: `dark`, `light`, optionally `sc` (scrolled).
 * - Respects `prefers-reduced-motion`.
 *
 * Call once from <Landing>. All DOM elements are queried on each frame
 * (cheap on modern browsers; landing has ~15 images max).
 */
export function useParallax(): void {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const DARK_SECTIONS = ["hero", "strip", "como", "equipo"];
    const LIGHT_SECTIONS = ["actividades", "planes", "contacto"];

    let rafId: number | null = null;
    let lastScrollY = -1;

    function tick() {
      const sy = window.scrollY;
      if (sy !== lastScrollY) {
        lastScrollY = sy;
        applyParallax();
        applyNavTheme(sy);
      }
      rafId = requestAnimationFrame(tick);
    }

    function applyParallax() {
      const vh = window.innerHeight;
      const imgs = document.querySelectorAll<HTMLElement>(".pimg");
      imgs.forEach((img) => {
        const container =
          img.closest<HTMLElement>(".pcol") ||
          img.closest<HTMLElement>(".acard") ||
          img.closest<HTMLElement>(".p-section") ||
          (img.parentElement as HTMLElement);
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Skip elements far off-screen (perf)
        if (rect.bottom < -vh || rect.top > vh * 2) return;

        const centerY = rect.top + rect.height / 2;
        const distFromCenter = centerY - vh / 2;
        const speed = parseFloat(img.dataset.speed ?? "0.15");
        const offset = distFromCenter * speed;
        img.style.transform = `translateY(${offset}px)`;
      });
    }

    function applyNavTheme(sy: number) {
      const nav = document.getElementById("landing-nav");
      if (!nav) return;
      // The nav's vertical center sits at y=32 (h-16 / 2).
      // Find which section spans across that y.
      let isDark = true;
      for (const id of [...DARK_SECTIONS, ...LIGHT_SECTIONS]) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 32 && r.bottom >= 32) {
          isDark = DARK_SECTIONS.includes(id);
          break;
        }
      }
      const scrolled = sy > 20;
      nav.className = (isDark ? "dark" : "light") + (scrolled ? " sc" : "");
    }

    // Initial frame
    applyParallax();
    applyNavTheme(window.scrollY);
    tick();

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
}
```

- [ ] **Step 4.2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 4.3: Commit**

```bash
git add frontend/src/hooks/useParallax.ts
git commit -m "feat(landing): add useParallax hook with reduced-motion support"
```

---

## Task 5: Datos estáticos extendidos

**Files:**
- Modify: `frontend/src/components/landing/data.ts`

- [ ] **Step 5.1: Leer data.ts actual**

```bash
cat frontend/src/components/landing/data.ts
```

Expected: exports `ACTIVIDADES`, `EQUIPO`, `PLANES`, `STATS`, `PASOS`.

- [ ] **Step 5.2: Agregar arrays de imágenes al final del archivo**

Anexar al final de `frontend/src/components/landing/data.ts`:

```typescript

// ── Stock imagery paths (served from /public/images/stock/) ──
export const HERO_IMAGES: { src: string; speed: number }[] = [
  { src: "/images/stock/hero-1.jpg", speed: 0.25 },
  { src: "/images/stock/hero-2.jpg", speed: 0.15 },
  { src: "/images/stock/hero-3.jpg", speed: 0.20 },
];

export const STRIP_IMAGES: { src: string; speed: number; num: string; name: string; dur: string }[] = [
  { src: "/images/stock/strip-1.jpg", speed: 0.18, num: "01", name: "Pilates Reformer",       dur: "50 min" },
  { src: "/images/stock/strip-2.jpg", speed: 0.22, num: "02", name: "Entrenamiento Integral", dur: "60 min" },
  { src: "/images/stock/strip-3.jpg", speed: 0.17, num: "04", name: "Cardio Intensivo",       dur: "45 min" },
  { src: "/images/stock/strip-4.jpg", speed: 0.20, num: "05", name: "Active Recovery",        dur: "50 min" },
  { src: "/images/stock/strip-5.jpg", speed: 0.19, num: "06", name: "Readaptación Dep.",      dur: "60 min" },
];

// Section background images (parallax bg behind content)
export const SECTION_BG = {
  actividades: { src: "/images/stock/section-actividades.jpg", speed: 0.12 },
  como:        { src: "/images/stock/section-como.jpg",        speed: 0.13 },
  equipo:      { src: "/images/equipo/equipo-grupo-1.png",     speed: 0.10 },
  contacto:    { src: "/images/stock/section-contacto.jpg",    speed: 0.11 },
};
```

- [ ] **Step 5.3: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 5.4: Commit**

```bash
git add frontend/src/components/landing/data.ts
git commit -m "feat(landing): add image manifests (hero, strip, section bg)"
```

---

## Task 6: Landing wrapper + useParallax inicialización

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 6.1: Reescribir Landing.tsx**

Reemplazar contenido completo de `frontend/src/pages/Landing.tsx`:

```tsx
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

- [ ] **Step 6.2: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(landing): wire useParallax in Landing wrapper"
```

---

## Task 7: LandingNav (con tema dual)

**Files:**
- Modify: `frontend/src/components/landing/LandingNav.tsx`

- [ ] **Step 7.1: Reescribir LandingNav.tsx**

Reemplazar contenido completo:

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const NAV_LINKS = [
  { label: "Actividades", href: "#actividades" },
  { label: "Equipo",      href: "#equipo" },
  { label: "Planes",      href: "#planes" },
  { label: "Contacto",    href: "#contacto" },
];

export default function LandingNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const dashboardPath = user
    ? user.rol === "admin"    ? "/admin/dashboard"
    : user.rol === "profesor" ? "/profesor/dashboard"
    :                            "/alumno/dashboard"
    : "/login";

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  // The class (dark/light + optional sc) is applied by useParallax hook based
  // on which section is under the nav. We just paint styles per class.
  return (
    <nav
      id="landing-nav"
      className="dark"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        height: "64px",
        transition: "background 280ms, backdrop-filter 280ms, border-color 280ms",
        fontFamily: "var(--font-landing)",
      }}
    >
      <style>{`
        #landing-nav { background: transparent; border-bottom: 1px solid transparent; }
        #landing-nav.dark.sc { background: rgba(20,20,20,0.9); backdrop-filter: blur(12px); border-bottom-color: rgba(255,255,255,0.08); }
        #landing-nav.light.sc { background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom-color: var(--color-light-border); }
        #landing-nav.dark a.nl, #landing-nav.dark.sc a.nl { color: rgba(255,255,255,0.55); }
        #landing-nav.dark a.nl:hover, #landing-nav.dark.sc a.nl:hover { color: #fff; }
        #landing-nav.light a.nl, #landing-nav.light.sc a.nl { color: var(--color-muted-stone); }
        #landing-nav.light a.nl:hover, #landing-nav.light.sc a.nl:hover { color: var(--color-dark-charcoal); }
        #landing-nav .burger span { background: var(--color-deep-graphite); }
        #landing-nav.dark .burger span, #landing-nav.dark.sc .burger span { background: #fff; }
      `}</style>

      <Link to="/" style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        <img src="/hsp-70-logo.png" alt="HSP-70" style={{ height: "36px", width: "auto" }} />
      </Link>

      {/* Desktop */}
      <div className="hidden md:flex" style={{ alignItems: "center", gap: "28px" }}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="nl"
            onClick={(e) => handleScrollTo(e, l.href)}
            style={{ fontSize: "13px", fontWeight: 500, textDecoration: "none", letterSpacing: "0.02em", cursor: "pointer", transition: "color 180ms" }}
          >
            {l.label}
          </a>
        ))}
        <Link
          to={dashboardPath}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            backgroundColor: "var(--color-light-mist)",
            color: "var(--color-dark-charcoal)",
            borderRadius: "var(--radius-amp-btn)",
            padding: "8px 16px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          {user ? "Mi panel" : "Ingresar"}
        </Link>
        <Link
          to="/register"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "var(--color-orange-ember)",
            borderRadius: "var(--radius-amp-btn)",
            padding: "8px 20px",
            textDecoration: "none",
            boxShadow: "var(--shadow-amp-cta)",
            cursor: "pointer",
            transition: "opacity 180ms",
          }}
        >
          Empezar gratis
        </Link>
      </div>

      {/* Mobile burger */}
      <button
        className="md:hidden burger"
        onClick={() => setOpen(!open)}
        aria-label="Menú"
        style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "8px", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", transform: open ? "rotate(45deg) translate(0, 8px)" : "none" }} />
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", opacity: open ? 0 : 1 }} />
        <span style={{ display: "block", width: "20px", height: "2px", transition: "all 200ms", transform: open ? "rotate(-45deg) translate(0, -8px)" : "none" }} />
      </button>

      {/* Mobile menu drawer */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: "absolute",
            top: "64px",
            left: 0,
            right: 0,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            backgroundColor: "var(--color-white-canvas)",
            borderTop: "1px solid var(--color-light-border)",
          }}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => handleScrollTo(e, l.href)}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-dark-charcoal)", textDecoration: "none", cursor: "pointer" }}
            >
              {l.label}
            </a>
          ))}
          <Link
            to={dashboardPath}
            onClick={() => setOpen(false)}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              textAlign: "center",
              padding: "12px",
              backgroundColor: "var(--color-light-mist)",
              color: "var(--color-dark-charcoal)",
              borderRadius: "var(--radius-amp-btn)",
              textDecoration: "none",
            }}
          >
            {user ? "Mi panel" : "Ingresar"}
          </Link>
          <Link
            to="/register"
            onClick={() => setOpen(false)}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
              padding: "12px",
              backgroundColor: "var(--color-orange-ember)",
              color: "#fff",
              borderRadius: "var(--radius-amp-btn)",
              boxShadow: "var(--shadow-amp-cta)",
              textDecoration: "none",
            }}
          >
            Empezar gratis
          </Link>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 7.2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 7.3: Commit**

```bash
git add frontend/src/components/landing/LandingNav.tsx
git commit -m "feat(landing): LandingNav with dual theme via useParallax"
```

---

## Task 8: LandingHero (3 columnas parallax)

**Files:**
- Modify: `frontend/src/components/landing/LandingHero.tsx`

- [ ] **Step 8.1: Reescribir LandingHero.tsx**

Reemplazar contenido completo:

```tsx
import { Link } from "react-router-dom";
import { HERO_IMAGES } from "./data";

export default function LandingHero() {
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
      }}
    >
      {/* 3-column parallax grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "2px",
          zIndex: 0,
        }}
      >
        {HERO_IMAGES.map((img, i) => (
          <div key={i} className="pcol" style={{ position: "relative", overflow: "hidden" }}>
            <img
              className="pimg"
              data-speed={img.speed}
              src={img.src}
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
                filter: "brightness(0.35)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Dark gradient shade over everything */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%), linear-gradient(to right, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.2) 100%)",
        }}
      />

      {/* Orange hairlines between columns */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "33.33%", width: "1.5px", background: "rgba(249,115,22,0.3)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "66.66%", width: "1.5px", background: "rgba(249,115,22,0.3)", zIndex: 2, pointerEvents: "none" }} />

      {/* Hero body */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: "680px", padding: "0 24px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "20px" }}>
          HSP-70 · Comodoro Rivadavia · Chubut
        </p>
        <h1
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(52px, 9vw, 78px)",
            fontWeight: 300,
            letterSpacing: "-0.036em",
            lineHeight: 0.9,
            color: "#fff",
            marginBottom: "18px",
            textShadow: "0 2px 48px rgba(0,0,0,0.5)",
            textTransform: "none",
          }}
        >
          Salud <span style={{ color: "var(--color-orange-ember)" }}>&amp;</span><br/>Ciencia
        </h1>
        <p style={{ fontSize: "17px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, maxWidth: "420px", margin: "0 auto 38px" }}>
          Centro de fitness y rendimiento físico. Reservá clases online, sin mensualidades forzadas.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            to="/register"
            style={{
              backgroundColor: "var(--color-orange-ember)",
              color: "#fff",
              borderRadius: "var(--radius-amp-btn)",
              padding: "14px 32px",
              fontFamily: "var(--font-landing)",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-amp-cta)",
              textDecoration: "none",
              transition: "opacity 180ms",
            }}
          >
            Empezar gratis
          </Link>
          <button
            onClick={() => document.getElementById("actividades")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: "var(--radius-amp-btn)",
              padding: "14px 32px",
              fontFamily: "var(--font-landing)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "background 180ms",
            }}
          >
            Ver actividades
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", bottom: "36px", left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "1px", height: "36px", background: "rgba(255,255,255,0.35)", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "10px", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>scroll</span>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </section>
  );
}
```

- [ ] **Step 8.2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 8.3: Commit**

```bash
git add frontend/src/components/landing/LandingHero.tsx
git commit -m "feat(landing): LandingHero with 3-column parallax"
```

---

## Task 9: LandingActividadesStrip (componente nuevo)

**Files:**
- Create: `frontend/src/components/landing/LandingActividadesStrip.tsx`

- [ ] **Step 9.1: Crear el componente**

```tsx
import { STRIP_IMAGES } from "./data";

export default function LandingActividadesStrip() {
  return (
    <div
      id="strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "2px",
        height: "260px",
        backgroundColor: "#000",
      }}
    >
      {STRIP_IMAGES.map((card) => (
        <div key={card.num} className="acard" style={{ position: "relative", overflow: "hidden", cursor: "default" }}>
          <img
            className="pimg"
            data-speed={card.speed}
            src={card.src}
            alt={card.name}
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
            style={{
              position: "absolute",
              top: "-35%",
              left: 0,
              right: 0,
              height: "170%",
              objectFit: "cover",
              willChange: "transform",
              filter: "brightness(0.35)",
              transition: "filter 320ms ease",
            }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "var(--color-orange-ember)", fontWeight: 600, letterSpacing: "0.2em", fontFamily: "ui-monospace, monospace" }}>
              {card.num}
            </div>
            <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600, marginTop: "3px", lineHeight: 1.2 }}>{card.name}</div>
            <span
              style={{
                display: "inline-block",
                marginTop: "5px",
                fontSize: "10px",
                color: "rgba(255,255,255,0.5)",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "2px 8px",
              }}
            >
              {card.dur}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 9.2: Verificar tipos**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 9.3: Commit**

```bash
git add frontend/src/components/landing/LandingActividadesStrip.tsx
git commit -m "feat(landing): add LandingActividadesStrip with 5 parallax cards"
```

---

## Task 10: LandingActividades (lista con bg parallax)

**Files:**
- Modify: `frontend/src/components/landing/LandingActividades.tsx`

- [ ] **Step 10.1: Reescribir el componente**

```tsx
import { ACTIVIDADES, SECTION_BG } from "./data";

export default function LandingActividades() {
  return (
    <section id="actividades" className="p-section" style={{ position: "relative", overflow: "hidden" }}>
      <img
        className="pimg"
        data-speed={SECTION_BG.actividades.speed}
        src={SECTION_BG.actividades.src}
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
          filter: "brightness(0.07) saturate(0.3)",
        }}
      />
      {/* light overlay */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(229,229,229,0.93)" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            Lo que hacemos
          </p>
          <h2
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--color-dark-charcoal)",
              marginBottom: "48px",
              textTransform: "none",
            }}
          >
            Actividades
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ACTIVIDADES.map((a) => (
              <div
                key={a.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid var(--color-light-border)",
                  borderRadius: "var(--radius-amp-card)",
                  padding: "18px 16px",
                  transition: "box-shadow 200ms, background 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)";
                  e.currentTarget.style.background = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = "rgba(255,255,255,0.85)";
                }}
              >
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", color: "var(--color-orange-ember)", width: "26px", flexShrink: 0 }}>
                  {a.num}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0a0a0a", fontFamily: "var(--font-landing)" }}>{a.nombre}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-muted-stone)", marginTop: "2px" }}>{a.desc}</div>
                </div>
                <span style={{ fontSize: "11px", color: "var(--color-muted-stone)", background: "rgba(243,244,243,0.8)", borderRadius: "12px", padding: "3px 12px", flexShrink: 0, fontFamily: "var(--font-landing)" }}>
                  {a.duracion}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 10.2: Commit**

```bash
git add frontend/src/components/landing/LandingActividades.tsx
git commit -m "feat(landing): LandingActividades with parallax bg + light overlay"
```

---

## Task 11: LandingComoFunciona (bg parallax + overlay naranja)

**Files:**
- Modify: `frontend/src/components/landing/LandingComoFunciona.tsx`

- [ ] **Step 11.1: Reescribir el componente**

```tsx
import { PASOS, SECTION_BG } from "./data";

export default function LandingComoFunciona() {
  return (
    <section id="como" className="p-section" style={{ position: "relative", overflow: "hidden" }}>
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

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            El sistema
          </p>
          <h2
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: "48px",
              textTransform: "none",
            }}
          >
            Cómo funciona
          </h2>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {PASOS.map((paso, i) => (
              <div key={paso.n}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-amp-btn)",
                      flexShrink: 0,
                      background: "rgba(0,0,0,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#fff",
                      fontFamily: "var(--font-landing)",
                    }}
                  >
                    {paso.n}
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#fff", fontFamily: "var(--font-landing)" }}>{paso.titulo}</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.72)", marginTop: "4px", lineHeight: 1.55 }}>{paso.desc}</div>
                  </div>
                </div>
                {i < PASOS.length - 1 && <div style={{ width: "1px", height: "26px", background: "rgba(255,255,255,0.25)", margin: "6px 0 6px 20px" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add frontend/src/components/landing/LandingComoFunciona.tsx
git commit -m "feat(landing): LandingComoFunciona with parallax bg + orange overlay"
```

---

## Task 12: LandingPlanes (sin parallax, sección limpia)

**Files:**
- Modify: `frontend/src/components/landing/LandingPlanes.tsx`

- [ ] **Step 12.1: Reescribir el componente**

```tsx
import { Link } from "react-router-dom";
import { PLANES } from "./data";

export default function LandingPlanes() {
  return (
    <section
      id="planes"
      style={{
        position: "relative",
        backgroundColor: "var(--color-white-canvas)",
        padding: "100px 48px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
          Flexibilidad total
        </p>
        <h2
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--color-dark-charcoal)",
            marginBottom: "48px",
            textTransform: "none",
          }}
        >
          Packs de créditos
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {PLANES.map((plan) => {
            const featured = plan.badge !== null;
            return (
              <div
                key={plan.nombre}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: featured ? "var(--color-soft-peach)" : "var(--color-white-canvas)",
                  borderRadius: "var(--radius-amp-card)",
                  border: `1px solid ${featured ? "var(--color-orange-ember)" : "var(--color-light-border)"}`,
                  padding: "28px 16px 20px",
                  transition: "box-shadow 200ms",
                }}
                onMouseEnter={(e) => {
                  if (!featured) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!featured) e.currentTarget.style.boxShadow = "none";
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "4px 14px",
                      color: "#fff",
                      backgroundColor: "var(--color-orange-ember)",
                      borderRadius: "12px",
                      fontFamily: "var(--font-landing)",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: featured ? "var(--color-orange-ember)" : "var(--color-muted-stone)",
                    marginBottom: "12px",
                    marginTop: featured ? "12px" : 0,
                    fontFamily: "var(--font-landing)",
                  }}
                >
                  {plan.nombre}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-landing)",
                    fontSize: "48px",
                    fontWeight: 300,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    color: "var(--color-deep-graphite)",
                  }}
                >
                  {plan.creditos}
                </div>
                <div style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted-stone)", marginTop: "4px", marginBottom: "24px", fontFamily: "var(--font-landing)" }}>
                  créditos
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px", flex: 1, listStyle: "none", padding: 0 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: "12px", color: "var(--color-muted-stone)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "var(--color-orange-ember)" }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  style={
                    featured
                      ? {
                          backgroundColor: "var(--color-orange-ember)",
                          color: "#fff",
                          borderRadius: "var(--radius-amp-btn)",
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          boxShadow: "var(--shadow-amp-cta)",
                          fontFamily: "var(--font-landing)",
                          transition: "opacity 180ms",
                        }
                      : {
                          backgroundColor: "var(--color-light-mist)",
                          color: "var(--color-dark-charcoal)",
                          borderRadius: "var(--radius-amp-btn)",
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          fontFamily: "var(--font-landing)",
                          transition: "opacity 180ms",
                        }
                  }
                >
                  Empezar
                </Link>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "12px", color: "var(--color-muted-stone)", textAlign: "center", marginTop: "20px", fontFamily: "var(--font-landing)" }}>
          Precios a confirmar · 1 crédito = 1 clase en cualquier actividad
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 12.2: Commit**

```bash
git add frontend/src/components/landing/LandingPlanes.tsx
git commit -m "feat(landing): LandingPlanes with featured peach card"
```

---

## Task 13: LandingEquipo (bg parallax con foto real + 8 cards)

**Files:**
- Modify: `frontend/src/components/landing/LandingEquipo.tsx`

- [ ] **Step 13.1: Reescribir el componente**

```tsx
import { EQUIPO, SECTION_BG } from "./data";

export default function LandingEquipo() {
  return (
    <section id="equipo" className="p-section" style={{ position: "relative", overflow: "hidden", backgroundColor: "#111" }}>
      <img
        className="pimg"
        data-speed={SECTION_BG.equipo.speed}
        src={SECTION_BG.equipo.src}
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
          filter: "brightness(0.12) saturate(0.3)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(10,10,10,0.75), rgba(10,10,10,0.6))" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            Quiénes somos
          </p>
          <h2
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "#fff",
              marginBottom: "48px",
              textTransform: "none",
            }}
          >
            El equipo
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            {EQUIPO.map((m) => (
              <div
                key={m.nombre}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "var(--radius-amp-card)",
                  overflow: "hidden",
                  transition: "background 200ms, border-color 200ms",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
                  <img
                    src={m.foto}
                    alt={m.nombre}
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: "brightness(0.88)", transition: "filter 280ms" }}
                  />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "var(--color-orange-ember)" }} />
                </div>
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", lineHeight: 1.3, fontFamily: "var(--font-landing)" }}>{m.nombre}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "3px" }}>{m.rol}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 13.2: Commit**

```bash
git add frontend/src/components/landing/LandingEquipo.tsx
git commit -m "feat(landing): LandingEquipo with real HSP-70 photo parallax bg"
```

---

## Task 14: LandingContacto (bg parallax + map + WhatsApp)

**Files:**
- Modify: `frontend/src/components/landing/LandingContacto.tsx`

- [ ] **Step 14.1: Reescribir el componente**

```tsx
import { SECTION_BG } from "./data";

export default function LandingContacto() {
  const waUrl = "https://wa.me/5492976257545?text=Hola!%20Quiero%20saber%20m%C3%A1s%20sobre%20HSP-70";

  const contactItems = [
    {
      label: "San Martín 1085",
      sub: "Comodoro Rivadavia, Chubut",
      icon: (
        <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "+549 297 6257545",
      sub: "Llamadas y mensajes",
      icon: (
        <svg style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="contacto" className="p-section" style={{ position: "relative", overflow: "hidden" }}>
      <img
        className="pimg"
        data-speed={SECTION_BG.contacto.speed}
        src={SECTION_BG.contacto.src}
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
          filter: "brightness(0.06) saturate(0.2)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "rgba(243,244,243,0.94)" }} />

      <div style={{ position: "relative", zIndex: 2, padding: "100px 48px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-orange-ember)", marginBottom: "12px", fontFamily: "var(--font-landing)" }}>
            Encontranos
          </p>
          <h2
            style={{
              fontFamily: "var(--font-landing)",
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "var(--color-dark-charcoal)",
              marginBottom: "48px",
              textTransform: "none",
            }}
          >
            Ubicación
          </h2>

          <div style={{ width: "100%", height: "220px", borderRadius: "var(--radius-amp-img)", border: "1px solid var(--color-light-border)", overflow: "hidden", marginBottom: "20px", background: "rgba(255,255,255,0.7)" }}>
            <iframe
              title="HSP-70"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2930.1!2d-67.4956!3d-45.8654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSan%20Mart%C3%ADn%201085!5e0!3m2!1ses!2sar!4v1"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {contactItems.map((it) => (
            <div
              key={it.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(4px)",
                border: "1px solid var(--color-light-border)",
                borderRadius: "var(--radius-amp-card)",
                marginBottom: "10px",
              }}
            >
              <div style={{ width: "40px", height: "40px", borderRadius: "var(--radius-amp-card)", flexShrink: 0, background: "var(--color-light-mist)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-orange-ember)" }}>
                {it.icon}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0a0a0a", fontFamily: "var(--font-landing)" }}>{it.label}</div>
                <div style={{ fontSize: "12px", color: "var(--color-muted-stone)", marginTop: "2px" }}>{it.sub}</div>
              </div>
            </div>
          ))}

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              width: "100%",
              padding: "14px 32px",
              background: "#25d366",
              color: "#fff",
              borderRadius: "var(--radius-amp-btn)",
              fontFamily: "var(--font-landing)",
              fontSize: "14px",
              fontWeight: 600,
              marginTop: "8px",
              textDecoration: "none",
              transition: "opacity 180ms",
            }}
          >
            <svg style={{ width: "20px", height: "20px", flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 14.2: Commit**

```bash
git add frontend/src/components/landing/LandingContacto.tsx
git commit -m "feat(landing): LandingContacto with parallax bg + map + WhatsApp"
```

---

## Task 15: LandingFooter (True Black, sin parallax)

**Files:**
- Modify: `frontend/src/components/landing/LandingFooter.tsx`

- [ ] **Step 15.1: Reescribir el componente**

```tsx
export default function LandingFooter() {
  const links = [
    { label: "Instagram", href: "https://www.instagram.com/saludcienciahsp70" },
    { label: "Facebook",  href: "https://www.facebook.com/saludcienciahsp70" },
    { label: "WhatsApp",  href: "https://wa.me/5492976257545" },
  ];

  return (
    <footer
      style={{
        background: "var(--color-true-black)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "56px 48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "18px",
        fontFamily: "var(--font-landing)",
      }}
    >
      <img src="/hsp-70-logo.png" alt="HSP-70" style={{ height: "40px", opacity: 0.55 }} />
      <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>
        Salud &amp; Ciencia · Comodoro Rivadavia
      </p>
      <div style={{ display: "flex", gap: "32px" }}>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.28)", textDecoration: "none", transition: "color 180ms" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-orange-ember)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            {l.label}
          </a>
        ))}
      </div>
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.12)" }}>
        © {new Date().getFullYear()} HSP-70 · Todos los derechos reservados
      </p>
    </footer>
  );
}
```

- [ ] **Step 15.2: Commit**

```bash
git add frontend/src/components/landing/LandingFooter.tsx
git commit -m "feat(landing): LandingFooter true black with hover orange links"
```

---

## Task 16: Verificación local antes de push

**Files:** ninguno modificado

- [ ] **Step 16.1: TypeScript check completo**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errores.

- [ ] **Step 16.2: Build de producción para detectar bundling errors**

```bash
cd frontend && npm run build
```

Expected: build exitoso, mensaje `built in NNNms`. Si falla por env vars de Supabase, ese error preexiste y no bloquea (la landing sigue funcionando en `npm run dev`).

- [ ] **Step 16.3: Arrancar dev server**

```bash
cd frontend && npm run dev
```

Expected: `VITE ready in NNN ms`, URL `http://localhost:5173/`.

- [ ] **Step 16.4: Verificación visual en browser**

Abrir manualmente `http://localhost:5173/` en el browser y verificar:

| Check | Esperado |
|---|---|
| Carga inicial | Hero oscuro con 3 columnas de fotos deportivas + headline "Salud & Ciencia" en Montserrat 300 |
| Scroll hacia abajo | Las 3 fotos del hero se mueven a velocidades distintas (parallax visible) |
| Strip 5 cards | Cada card tiene foto distinta con parallax propio |
| Sección Actividades | Fondo claro con foto muy oscurecida apenas visible detrás del overlay |
| Sección Cómo funciona | Fondo naranja con foto oscurecida detrás (parallax sutil) |
| Sección Planes | Fondo blanco limpio, card "Pro" con peach + badge + sombra naranja |
| Sección Equipo | Fondo oscuro con foto grupo HSP-70 muy oscurecida + 8 cards con retratos reales |
| Sección Contacto | Fondo claro con foto detrás + mapa + cards de info + botón WhatsApp |
| Footer | True Black con logo opaco |
| Nav | Cambia entre tema oscuro/claro al scrollear por distintas secciones |
| Click en links nav | Smooth scroll a cada sección |
| Click "Empezar gratis" | Navega a `/register` |

- [ ] **Step 16.5: Test prefers-reduced-motion**

En DevTools de Chrome:
1. F12 → Rendering tab (`More tools` → `Rendering`)
2. Emulate CSS media feature `prefers-reduced-motion` → `reduce`
3. Recargar la página
4. Scrollear — el parallax NO debe ejecutarse (las imágenes quedan fijas)

Expected: imágenes no se transforman al scrollear.

- [ ] **Step 16.6: Test mobile (375px)**

En DevTools: toggle device toolbar (Ctrl+Shift+M), seleccionar iPhone SE (375px).

Verificar:
- No hay overflow horizontal
- Botones nav se reemplazan por burger
- Click en burger abre menú con todos los links
- Las secciones siguen legibles, las cards se apilan en una columna

Expected: layout responsive sin errores visuales.

- [ ] **Step 16.7: Detener dev server**

`Ctrl+C` en la terminal donde corre `npm run dev`.

---

## Task 17: Confirmar con el usuario antes de push

**Files:** ninguno modificado

- [ ] **Step 17.1: Pedir aprobación explícita**

Antes de continuar al Task 18, mostrar al usuario:
- Lista de los 15 commits creados en el branch `feat/landing-parallax-amp`
- Confirmación de que `npx tsc --noEmit` pasa
- Confirmación de que la verificación visual del Task 16 está OK

Preguntar literalmente: **"Verificado en local. ¿Hago push a `feat/landing-parallax-amp` y abro PR a `production`?"**

NO continuar al Task 18 hasta tener respuesta afirmativa del usuario.

---

## Task 18: Push + PR (solo después de aprobación)

**Files:** ninguno modificado

- [ ] **Step 18.1: Push del branch**

```bash
git push origin feat/landing-parallax-amp
```

Expected: branch publicado en origin.

- [ ] **Step 18.2: Crear PR contra production**

```bash
gh pr create \
  --base production \
  --title "feat(landing): amp redesign + parallax scroll + sports imagery" \
  --body "$(cat <<'EOF'
## Summary
- Rediseño completo de la landing con sistema visual amp (light minimalist, Montserrat 300, paleta naranja HSP-70)
- Parallax scroll en todas las secciones (hero, strip actividades, actividades, cómo funciona, equipo, contacto)
- Imágenes deportivas reales: fotos del equipo HSP-70 + stock Unsplash temporal para fondos
- Motor parallax centralizado en \`useParallax\` hook con soporte de \`prefers-reduced-motion\`

## Files changed
- New: \`frontend/src/hooks/useParallax.ts\`
- New: \`frontend/src/components/landing/LandingActividadesStrip.tsx\`
- New: 11 imágenes en \`frontend/public/images/stock/\`
- Modified: 8 componentes landing (Nav, Hero, Actividades, ComoFunciona, Planes, Equipo, Contacto, Footer)
- Modified: \`frontend/src/index.css\` (tokens amp + Montserrat)
- Modified: \`frontend/src/components/landing/data.ts\` (image manifests)
- Modified: \`frontend/src/pages/Landing.tsx\` (wire useParallax)

## Spec
\`docs/planes/2026-05-29-landing-parallax-design.md\`

## Verification
- \`npx tsc --noEmit\` ✅
- Visual smoke test local ✅ (todas las secciones cargan, parallax visible)
- Reduced motion ✅ (parallax se desactiva)
- Mobile 375px ✅ (sin overflow, menú burger funciona)

## Out of scope
- Tests automatizados (no hay framework UI)
- Fotos profesionales propias de HSP-70 (placeholders Unsplash hasta que estén disponibles)
- Fix del guard de \`supabase.ts\` (usuario lo dejó intencionalmente)
EOF
)"
```

Expected: PR URL devuelto por `gh`.

- [ ] **Step 18.3: Cerrar PR viejo #10**

```bash
gh pr close 10 --comment "Reemplazado por nuevo PR con amp + parallax + imágenes deportivas. Branch feat/landing-redesign-amp queda obsoleto."
```

Expected: PR #10 cerrado.

---

## Notas de implementación

- **Decisión menor del implementador:** si Unsplash no responde durante el Task 2, retry con curl. Si persiste, marcar el step como BLOCKED y pedir al usuario que provea fotos alternativas.
- **Si `useAuth` no se importa correctamente:** verificar que el path es `../../hooks/useAuth` (default export). Esto se confirmó en el rediseño anterior.
- **Si una sección no se ve:** abrir DevTools y verificar que el `IntersectionObserver` no está bloqueado por z-index. Las secciones `.p-section` deben tener `position: relative` siempre.
- **NO commitear `frontend/public/images/stock/`** si los archivos pesan más de 5MB combinados. En ese caso pedir al usuario que apruebe primero.
