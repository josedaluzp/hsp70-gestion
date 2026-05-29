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
