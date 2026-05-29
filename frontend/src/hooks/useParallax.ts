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
      const triggers: ReturnType<typeof ScrollTrigger.create>[] = [];

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
