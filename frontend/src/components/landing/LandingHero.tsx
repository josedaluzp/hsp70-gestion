import { Link } from "react-router-dom";

export default function LandingHero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden px-6 pt-24 pb-20"
      style={{ backgroundColor: "var(--color-white-canvas)" }}
    >
      {/* Decorative radial glow — DESIGN.md: subtle warm glow, no heavy gradients */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(249,115,22,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Eyebrow — caption size, orange-ember, spaced */}
        <p
          className="text-xs font-semibold uppercase mb-8"
          style={{
            fontFamily: "var(--font-landing)",
            color: "var(--color-orange-ember)",
            letterSpacing: "0.15em",
          }}
        >
          HSP-70 · Comodoro Rivadavia · Chubut
        </p>

        {/* Display-xl headline — DESIGN.md: 78px, weight 300, tracking -2.808px */}
        <h1
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "clamp(52px, 10vw, 78px)",
            fontWeight: 300,
            lineHeight: 0.9,
            letterSpacing: "-0.036em",
            color: "var(--color-dark-charcoal)",
            marginBottom: "24px",
          }}
        >
          Salud{" "}
          <span style={{ color: "var(--color-orange-ember)" }}>&amp;</span>
          <br className="hidden sm:block" />
          {" "}Ciencia
        </h1>

        {/* Subheading — body 16px, muted-stone */}
        <p
          className="mx-auto mb-10"
          style={{
            fontFamily: "var(--font-landing)",
            fontSize: "17px",
            fontWeight: 400,
            color: "var(--color-muted-stone)",
            lineHeight: 1.6,
            maxWidth: "440px",
          }}
        >
          Centro de fitness y rendimiento físico. Reservá clases online, sin mensualidades forzadas.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Primary — orange-ember, shadow-amp-cta, 24px radius */}
          <Link
            to="/register"
            className="cursor-pointer text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
            style={{
              backgroundColor: "var(--color-orange-ember)",
              borderRadius: "var(--radius-amp-btn)",
              padding: "14px 32px",
              boxShadow: "var(--shadow-amp-cta)",
              fontFamily: "var(--font-landing)",
            }}
          >
            Empezar gratis
          </Link>
          {/* Secondary — Solid Nav Button: light-mist bg, dark-charcoal text */}
          <button
            onClick={() => document.getElementById("actividades")?.scrollIntoView({ behavior: "smooth" })}
            className="cursor-pointer text-sm font-medium transition-colors duration-200 hover:opacity-80"
            style={{
              backgroundColor: "var(--color-light-mist)",
              color: "var(--color-dark-charcoal)",
              borderRadius: "var(--radius-amp-btn)",
              padding: "14px 32px",
              fontFamily: "var(--font-landing)",
            }}
          >
            Ver actividades
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="mt-20 flex flex-col items-center gap-2">
          <div className="w-px h-10 animate-pulse" style={{ backgroundColor: "var(--color-light-border)" }} />
          <span className="text-xs font-medium uppercase" style={{ color: "var(--color-muted-stone)", letterSpacing: "0.2em", fontFamily: "var(--font-landing)" }}>
            scroll
          </span>
        </div>
      </div>
    </section>
  );
}
