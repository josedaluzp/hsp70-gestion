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
