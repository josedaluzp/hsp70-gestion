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
                  ref={(el: HTMLDivElement | null) => {
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
