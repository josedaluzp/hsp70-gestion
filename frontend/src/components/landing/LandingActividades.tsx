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
