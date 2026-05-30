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
